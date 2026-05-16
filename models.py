from datetime import datetime, timedelta
import uuid
from database import db

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=True)
    google_id = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Give 1 day trial upon creation
    trial_expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=1))
    subscription_expires_at = db.Column(db.DateTime, nullable=True)
    
    profiles = db.relationship('Profile', backref='user', lazy=True)
    sessions = db.relationship('BotSession', backref='user', lazy=True)

    def is_active(self):
        now = datetime.utcnow()
        return (self.trial_expires_at and now < self.trial_expires_at) or \
               (self.subscription_expires_at and now < self.subscription_expires_at)

class Profile(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    linkedin_username = db.Column(db.String(120), nullable=False)
    password = db.Column(db.String(255), nullable=False) # Store the password just like in json for the bot
    resume_path = db.Column(db.String(255), nullable=True)
    resume_name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BotSession(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    profile_id = db.Column(db.String(36), db.ForeignKey('profile.id'), nullable=False)
    job_title = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(50), default='running') # running, completed, error
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    stats = db.Column(db.Text, nullable=True) # JSON string
    logs = db.Column(db.Text, nullable=True) # JSON string
