import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? "http://127.0.0.1:5000/api"
  : "/api";

export default function Subscription() {
  const { user, updateSubscription, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: order } = await axios.post(`${API_BASE}/payment/create-order`);

      const options = {
        key: order.key, 
        amount: order.amount,
        currency: "INR",
        name: "LinkedIn Automator",
        description: "1 Month Premium Bot Access",
        order_id: order.order_id,
        handler: async function (response) {
          try {
            const { data } = await axios.post(`${API_BASE}/payment/verify`, response);
            if (data.success) {
              updateSubscription(data.subscription_expires_at);
              navigate('/dashboard');
            }
          } catch (err) {
            console.error(err);
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#2563eb"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      alert("Could not initialize payment. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-violet-600"></div>
        
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/50">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Unlock Premium Automation</h1>
        <p className="text-zinc-400 text-sm mb-6">Your trial has expired. Subscribe to continue automating your job search and boost your career.</p>
        
        <div className="bg-zinc-800/50 rounded-2xl p-6 mb-8 border border-zinc-700/50 text-left">
          <div className="flex justify-between items-end mb-4">
            <span className="text-zinc-300 font-medium">Monthly Plan</span>
            <span className="text-3xl font-extrabold text-white">₹199<span className="text-sm text-zinc-500 font-medium">/mo</span></span>
          </div>
          <ul className="space-y-3">
            {[
              "Unlimited Bot Sessions",
              "Access to All Filters",
              "Detailed Application Logs",
              "Priority Processing",
              "Multiple LinkedIn Profiles"
            ].map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                <svg className="text-emerald-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <button 
          onClick={handleSubscribe} 
          disabled={loading}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {loading ? "Processing..." : "Subscribe Now"}
        </button>

        <button 
          onClick={handleLogout}
          className="mt-6 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
