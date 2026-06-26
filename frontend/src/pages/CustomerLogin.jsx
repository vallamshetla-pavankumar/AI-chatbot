import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LogIn, ArrowLeft } from 'lucide-react';
import './CustomerChat.css';

const loginSchema = z.object({
  loginId: z.string().min(1, 'Email or WhatsApp number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Login failed');

      localStorage.setItem('customer_token', result.token);
      localStorage.setItem('customer', JSON.stringify(result.customer));
      
      // Also prefill chatbot states
      localStorage.setItem('ahf_customer_name', result.customer.name);
      localStorage.setItem('ahf_customer_whatsapp', result.customer.whatsapp_number);

      toast.success(`Welcome back, ${result.customer.name}!`);
      navigate('/chat');
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page-container flex-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* ── BACKGROUND VIDEO ── */}
      {!videoFailed && (
        <video
          className="bg-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        >
          <source src="/Create_a_realistic_cinematic_a.mp4" type="video/mp4" />
        </video>
      )}

      {/* ── VIDEO OVERLAY (dark overlay) ── */}
      {!videoFailed && <div className="video-overlay" aria-hidden="true" />}

      {/* ── FALLBACK GRADIENT BLOBS ── */}
      {videoFailed && (
        <>
          <div className="bg-canvas" aria-hidden="true">
            <div className="blob blob-1" />
            <div className="blob blob-2" />
            <div className="blob blob-3" />
          </div>
          <div className="bg-overlay" aria-hidden="true" />
        </>
      )}

      <div className="header-logo" style={{ position: 'absolute', top: '1.5rem', left: '2rem', cursor: 'pointer', zIndex: 100 }} onClick={() => navigate('/')}>
        <img src="/logo.png" alt="Akshaya Homely Foods Logo" className="header-logo-img" />
        Akshaya Homely Foods
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
          position: 'relative',
          zIndex: 10,
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Branding" style={{ height: '56px', marginBottom: '0.75rem', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', margin: 0 }}>Customer Login</h2>
          <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.25rem' }}>Login to place orders with our AI assistant</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="form-label" htmlFor="loginId" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', fontWeight: '600' }}>Mobile Number or Email</label>
            <input
              type="text"
              id="loginId"
              placeholder="e.g. kiran@gmail.com or 91987..."
              className="form-input"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
                color: 'white',
                outline: 'none',
                fontSize: '0.9rem'
              }}
              {...register('loginId')}
            />
            {errors.loginId && <span className="form-error" style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.loginId.message}</span>}
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="form-label" htmlFor="password" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', fontWeight: '600' }}>Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              className="form-input"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
                color: 'white',
                outline: 'none',
                fontSize: '0.9rem'
              }}
              {...register('password')}
            />
            {errors.password && <span className="form-error" style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            className="send-btn"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              height: 'auto',
              padding: '0.85rem',
              borderRadius: '0.75rem',
              background: 'var(--brand-gradient)',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: '700',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {loading ? 'Logging in...' : <><LogIn size={16} /> Login</>}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#fb923c', fontWeight: '600', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
          Are you an Admin?{' '}
          <Link to="/admin/login" style={{ color: '#f87171', fontWeight: '600', textDecoration: 'none' }}>
            Admin Portal
          </Link>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={12} /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
