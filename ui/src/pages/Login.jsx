import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? "http://127.0.0.1:5000/api"
  : "/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const handleSuccess = async (credentialResponse) => {
    try {
      const { data } = await axios.post(`${API_BASE}/auth/google`, {
        token: credentialResponse.credential
      });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-extrabold text-white mb-2">LinkedIn Automator</h1>
        <p className="text-zinc-400 mb-8">Sign in to manage your automation campaigns</p>
        
        <div className="flex justify-center flex-col items-center gap-4">
          {/* <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => {
              console.log('Login Failed');
              alert('Google Login failed. Did you configure a valid GOOGLE_CLIENT_ID?');
            }}
            useOneTap
            theme="filled_black"
            shape="pill"
            size="large"
          /> */}
          
          <button 
            onClick={() => handleSuccess({ credential: 'mock_token_123' })}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20"
          >
            Bypass Login (Dev Mode)
          </button>
        </div>
        
        <p className="text-xs text-zinc-600 mt-8">By continuing, you agree to our Terms of Service</p>
      </div>
    </div>
  );
}
