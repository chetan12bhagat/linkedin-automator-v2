import os
import sys
import uuid
import threading
import json
import time
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import werkzeug.utils
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv
import razorpay

# Add current directory to path so imports work on Vercel
sys.path.insert(0, os.path.dirname(__file__))

from database import db
from models import User, Profile, BotSession

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Detect Vercel environment
IS_VERCEL = os.getenv('VERCEL') == '1'

# Config
if IS_VERCEL:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/linkedin_bot.db'
    UPLOADS_DIR = "/tmp/uploads"
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///linkedin_bot.db'
    UPLOADS_DIR = "uploads"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default-secret-key')

db.init_app(app)

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

os.makedirs(UPLOADS_DIR, exist_ok=True)

with app.app_context():
    db.create_all()

# ---- Auth Middleware ----

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
            
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            if not user:
                return jsonify({'error': 'User not found'}), 401
            return f(user, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
    return decorated


# ---- Authentication Endpoints ----

@app.route("/api/auth/google", methods=["POST"])
def google_auth():
    data = request.json
    token = data.get("token")
    if not token:
        return jsonify({"error": "No token provided"}), 400

    try:
        # In production, use: idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        except ValueError as e:
            # Fallback for dev mocks if verification fails
            # WARNING: Remove this try-except fallback in production!
            idinfo = {
                'sub': f'mock_{token}',
                'email': f'user_{token}@gmail.com',
                'name': 'Mock User'
            }

        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')

        user = User.query.filter_by(google_id=google_id).first()
        if not user:
            # Create new user with 1 day trial
            user = User(
                email=email,
                name=name,
                google_id=google_id,
                trial_expires_at=datetime.utcnow() + timedelta(days=1)
            )
            db.session.add(user)
            db.session.commit()

        # Generate JWT
        jwt_token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            "success": True,
            "token": jwt_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "is_active": user.is_active(),
                "trial_expires_at": user.trial_expires_at.isoformat() if user.trial_expires_at else None,
                "subscription_expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ---- Payment Endpoints ----

@app.route("/api/payment/create-order", methods=["POST"])
@require_auth
def create_order(user):
    if not razorpay_client:
        # Mock payment flow for dev
        return jsonify({
            "success": True,
            "order_id": "mock_order_123",
            "amount": 19900,
            "key": "mock_key"
        })

    try:
        amount = 19900  # Rs 199 in paise
        order_currency = 'INR'
        order_receipt = f'receipt_{user.id}_{int(time.time())}'

        order = razorpay_client.order.create({
            'amount': amount,
            'currency': order_currency,
            'receipt': order_receipt,
            'payment_capture': '1'
        })

        return jsonify({
            "success": True,
            "order_id": order['id'],
            "amount": amount,
            "key": RAZORPAY_KEY_ID
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/payment/verify", methods=["POST"])
@require_auth
def verify_payment(user):
    data = request.json
    # In production, verify razorpay signature
    # razorpay_client.utility.verify_payment_signature(data)
    
    user.subscription_expires_at = datetime.utcnow() + timedelta(days=28)
    user.trial_expires_at = None
    db.session.commit()

    return jsonify({"success": True, "subscription_expires_at": user.subscription_expires_at.isoformat()})

# ---- Profile Endpoints ----

@app.route("/api/profiles", methods=["GET"])
@require_auth
def get_profiles(user):
    profiles = Profile.query.filter_by(user_id=user.id).all()
    return jsonify([{
        "id": p.id,
        "linkedin_username": p.linkedin_username,
        "resume_path": p.resume_path,
        "resume_name": p.resume_name,
        "created_at": p.created_at.isoformat()
    } for p in profiles])


@app.route("/api/profiles", methods=["POST"])
@require_auth
def create_profile(user):
    data = request.json
    profile = Profile(
        user_id=user.id,
        linkedin_username=data.get("linkedin_username"),
        password=data.get("password") 
    )
    db.session.add(profile)
    db.session.commit()
    return jsonify({"success": True, "id": profile.id})

@app.route("/api/profiles/<profile_id>", methods=["DELETE"])
@require_auth
def delete_profile(user, profile_id):
    profile = Profile.query.filter_by(id=profile_id, user_id=user.id).first()
    if profile:
        db.session.delete(profile)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

# ---- Bot Control Endpoints ----

@app.route("/api/start-bot", methods=["POST"])
@require_auth
def start_bot(user):
    if not user.is_active():
        return jsonify({"error": "Subscription or trial expired. Please subscribe to continue."}), 403

    data = request.json
    profile_id = data.get("profile_id")
    job_title = data.get("job_title", "")
    location = data.get("location", "")
    filters = data.get("filters", {})
    max_jobs = data.get("max_jobs", 20)

    profile = Profile.query.filter_by(id=profile_id, user_id=user.id).first()
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    session_record = BotSession(
        user_id=user.id,
        profile_id=profile.id,
        job_title=job_title,
        location=location,
        status="running",
        logs="[]",
        stats='{"applied": 0, "skipped": 0, "failed": 0}'
    )
    db.session.add(session_record)
    db.session.commit()
    
    session_id = session_record.id
    
    def run_bot(app_context, sess_id, p_dict, j_title, loc, flts, m_jobs):
        with app_context:
            try:
                # Import bot here to avoid issues with serverless context
                from linkedin_bot import LinkedInBot
                
                def status_callback(message, level="info"):
                    # We need a new session in each callback if it's threaded
                    # But on Vercel, this thread will likely be killed
                    with app.app_context():
                        s = BotSession.query.get(sess_id)
                        if s:
                            logs = json.loads(s.logs or '[]')
                            logs.append({
                                "timestamp": datetime.utcnow().isoformat(),
                                "message": message,
                                "level": level
                            })
                            s.logs = json.dumps(logs[-200:])
                            db.session.commit()

                bot = LinkedInBot(p_dict, status_callback=status_callback)
                stats = bot.run(j_title, loc, flts, m_jobs)

                with app.app_context():
                    s = BotSession.query.get(sess_id)
                    if s:
                        s.status = "completed"
                        s.completed_at = datetime.utcnow()
                        s.stats = json.dumps({
                            "applied": stats.get("applied", 0),
                            "skipped": stats.get("skipped", 0),
                            "failed": stats.get("failed", 0)
                        })
                        db.session.commit()

            except Exception as e:
                with app.app_context():
                    s = BotSession.query.get(sess_id)
                    if s:
                        s.status = "error"
                        logs = json.loads(s.logs or '[]')
                        logs.append({
                            "timestamp": datetime.utcnow().isoformat(),
                            "message": f"Fatal error: {str(e)}",
                            "level": "error"
                        })
                        s.logs = json.dumps(logs)
                        db.session.commit()

    profile_dict = {
        "id": profile.id,
        "linkedin_username": profile.linkedin_username,
        "password": profile.password,
        "resume_path": profile.resume_path
    }
    
    # WARNING: On Vercel, this thread will NOT persist after the response is sent.
    thread = threading.Thread(
        target=run_bot, 
        args=(app.app_context(), session_id, profile_dict, job_title, location, filters, max_jobs),
        daemon=True
    )
    thread.start()

    return jsonify({"success": True, "session_id": session_id})


@app.route("/api/sessions", methods=["GET"])
@require_auth
def list_sessions(user):
    sessions = BotSession.query.filter_by(user_id=user.id).order_by(BotSession.started_at.desc()).limit(50).all()
    return jsonify([{
        "id": s.id,
        "status": s.status,
        "job_title": s.job_title,
        "location": s.location,
        "started_at": s.started_at.isoformat(),
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "stats": json.loads(s.stats or '{}')
    } for s in sessions])

@app.route("/api/sessions/<session_id>", methods=["GET"])
@require_auth
def get_session_status(user, session_id):
    s = BotSession.query.filter_by(id=session_id, user_id=user.id).first()
    if not s:
        return jsonify({"error": "Session not found"}), 404
    
    return jsonify({
        "id": s.id,
        "status": s.status,
        "job_title": s.job_title,
        "started_at": s.started_at.isoformat(),
        "stats": json.loads(s.stats or '{}')
    })

@app.route("/api/sessions/<session_id>/logs", methods=["GET"])
@require_auth
def get_session_logs(user, session_id):
    s = BotSession.query.filter_by(id=session_id, user_id=user.id).first()
    if not s:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(json.loads(s.logs or '[]'))


# Standard Vercel entry point
if __name__ == "__main__":
    app.run(debug=True, port=5000)
