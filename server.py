"""
Flask API Server for LinkedIn Automation Bot
Handles profile management and bot execution
"""

import json
import os
import sys
import uuid
import threading
import time
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import werkzeug.utils

app = Flask(__name__)
CORS(app)

# Storage
PROFILES_FILE = "profiles.json"
SESSIONS_DIR = "sessions"
UPLOADS_DIR = "uploads"

os.makedirs(SESSIONS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Active sessions
active_sessions = {}


def load_profiles():
    if os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE) as f:
            return json.load(f)
    return []


def save_profiles(profiles):
    with open(PROFILES_FILE, "w") as f:
        json.dump(profiles, f, indent=2)


def get_session(session_id):
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if os.path.exists(session_file):
        with open(session_file) as f:
            return json.load(f)
    return None


def save_session(session_id, data):
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    with open(session_file, "w") as f:
        json.dump(data, f, indent=2)


# ---- Profile Endpoints ----

@app.route("/api/profiles", methods=["GET"])
def get_profiles():
    profiles = load_profiles()
    # Don't return passwords
    safe = [{k: v for k, v in p.items() if k != "password"} for p in profiles]
    return jsonify(safe)


@app.route("/api/profiles", methods=["POST"])
def create_profile():
    data = request.json
    profiles = load_profiles()
    data["id"] = str(uuid.uuid4())
    data["created_at"] = datetime.now().isoformat()
    profiles.append(data)
    save_profiles(profiles)
    return jsonify({"success": True, "id": data["id"]})


@app.route("/api/profiles/<profile_id>", methods=["PUT"])
def update_profile(profile_id):
    data = request.json
    profiles = load_profiles()
    for i, p in enumerate(profiles):
        if p["id"] == profile_id:
            data["id"] = profile_id
            data["updated_at"] = datetime.now().isoformat()
            profiles[i] = data
            save_profiles(profiles)
            return jsonify({"success": True})
    return jsonify({"error": "Profile not found"}), 404


@app.route("/api/profiles/<profile_id>", methods=["DELETE"])
def delete_profile(profile_id):
    profiles = load_profiles()
    profiles = [p for p in profiles if p["id"] != profile_id]
    save_profiles(profiles)
    return jsonify({"success": True})


@app.route("/api/profiles/<profile_id>/upload-resume", methods=["POST"])
def upload_resume(profile_id):
    if "resume" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["resume"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = werkzeug.utils.secure_filename(f"{profile_id}_{file.filename}")
    filepath = os.path.join(UPLOADS_DIR, filename)
    file.save(filepath)

    # Update profile with resume path
    profiles = load_profiles()
    for p in profiles:
        if p["id"] == profile_id:
            p["resume_path"] = os.path.abspath(filepath)
            p["resume_name"] = file.filename
            save_profiles(profiles)
            break

    return jsonify({"success": True, "resume_path": filepath, "resume_name": file.filename})


# ---- Bot Control Endpoints ----

@app.route("/api/start-bot", methods=["POST"])
def start_bot():
    data = request.json
    profile_id = data.get("profile_id")
    job_title = data.get("job_title", "")
    location = data.get("location", "")
    filters = data.get("filters", {})
    max_jobs = data.get("max_jobs", 20)

    if not profile_id or not job_title:
        return jsonify({"error": "profile_id and job_title are required"}), 400

    # Find profile
    profiles = load_profiles()
    profile = next((p for p in profiles if p["id"] == profile_id), None)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    session_id = str(uuid.uuid4())
    session_data = {
        "id": session_id,
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "job_title": job_title,
        "location": location,
        "logs": [],
        "stats": {"applied": 0, "skipped": 0, "failed": 0},
        "applied_jobs": [],
        "progress": 0
    }
    save_session(session_id, session_data)
    active_sessions[session_id] = session_data

    def run_bot():
        try:
            sys.path.insert(0, os.path.dirname(__file__))
            from linkedin_bot import LinkedInBot

            def status_callback(message, level="info"):
                s = get_session(session_id) or {}
                logs = s.get("logs", [])
                logs.append({
                    "timestamp": datetime.now().isoformat(),
                    "message": message,
                    "level": level
                })
                s["logs"] = logs[-200:]  # Keep last 200 logs
                save_session(session_id, s)

            bot = LinkedInBot(profile, status_callback=status_callback)
            stats = bot.run(job_title, location, filters, max_jobs)

            s = get_session(session_id) or {}
            s["status"] = "completed"
            s["completed_at"] = datetime.now().isoformat()
            s["stats"] = {
                "applied": stats.get("applied", 0),
                "skipped": stats.get("skipped", 0),
                "failed": stats.get("failed", 0)
            }
            s["applied_jobs"] = stats.get("applied_jobs", [])
            s["progress"] = 100
            save_session(session_id, s)

        except Exception as e:
            s = get_session(session_id) or {}
            s["status"] = "error"
            s["error"] = str(e)
            s["logs"] = s.get("logs", []) + [{
                "timestamp": datetime.now().isoformat(),
                "message": f"Fatal error: {str(e)}",
                "level": "error"
            }]
            save_session(session_id, s)

    thread = threading.Thread(target=run_bot, daemon=True)
    thread.start()

    return jsonify({"success": True, "session_id": session_id})


@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session_status(session_id):
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session)


@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    sessions = []
    for f in sorted(os.listdir(SESSIONS_DIR), reverse=True):
        if f.endswith(".json"):
            with open(os.path.join(SESSIONS_DIR, f)) as file:
                try:
                    s = json.load(file)
                    # Return minimal data
                    sessions.append({
                        "id": s.get("id"),
                        "status": s.get("status"),
                        "job_title": s.get("job_title"),
                        "location": s.get("location"),
                        "started_at": s.get("started_at"),
                        "stats": s.get("stats", {})
                    })
                except:
                    pass
    return jsonify(sessions[:50])


@app.route("/api/sessions/<session_id>/logs", methods=["GET"])
def get_session_logs(session_id):
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session.get("logs", []))


if __name__ == "__main__":
    print("LinkedIn Automation API running on http://localhost:5000")
    app.run(debug=False, host="0.0.0.0", port=5000)
