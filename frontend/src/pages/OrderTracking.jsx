import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, CheckCircle2, Circle, LogOut, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './OrderTracking.css';
import './CustomerChat.css';
import { cleanProductName } from '../utils/format';

const API_BASE = import.meta.env.VITE_API_URL;

const STATUS_STEPS = [
  { status: 'Received', label: 'Order Received', desc: 'We have received your order.', icon: '📥' },
  { status: 'Preparing', label: 'Preparing', desc: 'Our chef is preparing your fresh homemade food.', icon: '🍳' },
  { status: 'Ready', label: 'Ready', desc: 'Your food is packed and ready for dispatch.', icon: '📦' },
  { status: 'Out for Delivery', label: 'Out For Delivery', desc: 'Our delivery partner is on the way to you.', icon: '🛵' },
  { status: 'Delivered', label: 'Delivered', desc: 'Order delivered. Enjoy your homemade meal!', icon: '✨' },
];

function getPackSizeFactor(sizeStr) {
  if (!sizeStr) return 1.0;
  const clean = sizeStr.toLowerCase().replace(/\s+/g, '');
  if (clean.endsWith('ml')) {
    const val = parseFloat(clean.replace('ml', ''));
    return isNaN(val) ? 1.0 : val / 1000;
  }
  if (clean.endsWith('g')) {
    const val = parseFloat(clean.replace('g', ''));
    return isNaN(val) ? 1.0 : val / 1000;
  }
  if (clean.endsWith('kg')) {
    const val = parseFloat(clean.replace('kg', ''));
    return isNaN(val) ? 1.0 : val;
  }
  if (clean.endsWith('l')) {
    const val = parseFloat(clean.replace('l', ''));
    return isNaN(val) ? 1.0 : val;
  }
  const val = parseFloat(clean);
  return isNaN(val) ? 1.0 : val;
}

function getItemTotal(price, qty) {
  if (qty === null || qty === undefined) return 0;
  const qtyStr = String(qty).toLowerCase();
  
  let qtyNum = 1;
  const packsMatch = qtyStr.match(/^(\d+)\s*pack/i);
  if (packsMatch) {
    qtyNum = parseInt(packsMatch[1], 10) || 1;
  } else {
    const parsed = parseInt(qtyStr, 10);
    qtyNum = isNaN(parsed) ? 1 : parsed;
  }

  let finalSize = '';
  const parenMatch = qtyStr.match(/\(([^)]+)\)/);
  if (parenMatch) {
    finalSize = parenMatch[1];
  } else if (qtyStr.includes('g') || qtyStr.includes('kg') || qtyStr.includes('ml') || qtyStr.includes('l')) {
    finalSize = qtyStr;
  }

  if (!finalSize) {
    return price * qtyNum;
  }

  const factor = getPackSizeFactor(finalSize);
  return price * factor * qtyNum;
}

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeId, setActiveId] = useState(id);
  const [resolving, setResolving] = useState(!id);
  const [noOrders, setNoOrders] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      const fetchLatestOrder = async () => {
        try {
          const token = localStorage.getItem('customer_token');
          if (!token) {
            setNoOrders(true);
            setResolving(false);
            return;
          }

          const res = await fetch(`${API_BASE}/orders/customer/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!res.ok) throw new Error('Failed to fetch orders');
          const data = await res.json();
          if (data && data.length > 0) {
            setActiveId(data[0].id);
          } else {
            setNoOrders(true);
          }
        } catch (err) {
          console.error(err);
          setNoOrders(true);
        } finally {
          setResolving(false);
        }
      };

      fetchLatestOrder();
    } else {
      setActiveId(id);
      setResolving(false);
    }
  }, [id]);

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer');
    navigate('/');
  };

  // Use react-query to poll order status every 5 seconds
  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['trackOrder', activeId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/orders/${activeId}`);
      if (!res.ok) throw new Error('Order not found');
      return res.json();
    },
    enabled: !resolving && !!activeId,
    refetchInterval: 5000, // Refresh status every 5 seconds
    refetchIntervalInBackground: true,
  });

  // Get index of the current status in status array
  const getCurrentStepIndex = () => {
    if (!order) return -1;
    // Handle case-insensitive comparison
    const idx = STATUS_STEPS.findIndex(
      (s) => s.status.toLowerCase() === order.order_status.toLowerCase()
    );
    return idx !== -1 ? idx : 0;
  };

  const currentIdx = getCurrentStepIndex();

  if (resolving || isLoading) {
    return (
      <div className="tracking-page-container flex-center">
        {/* Background canvas for moving blobs */}
        <div className="bg-canvas" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <div className="bg-overlay" aria-hidden="true" />
        
        <div className="loading-container" style={{ zIndex: 10 }}>
          <Loader2 className="spinner" size={40} style={{ animation: 'spin 1s linear infinite', color: '#f97316' }} />
          <p style={{ marginTop: '1rem' }}>{resolving ? 'Locating your latest order...' : 'Loading order tracking details...'}</p>
        </div>
      </div>
    );
  }

  if (noOrders || isError || !order) {
    return (
      <div className="tracking-page-container flex-center" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Background canvas for moving blobs */}
        <div className="bg-canvas" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <div className="bg-overlay" aria-hidden="true" />

        {/* NAVBAR */}
        <header className="chat-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 15, 26, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="Akshaya Homely Foods Logo" className="header-logo-img" />
            Akshaya Homely Foods
          </div>

          {/* Desktop nav links */}
          <nav className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem' }}>Home</Link>
            <Link to="/my-orders" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              My Orders
            </Link>
            <Link to="/order-tracking" style={{ color: 'white', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Track Order
            </Link>
            <button onClick={handleLogout} className="new-chat-btn">
              <LogOut size={14} /> Logout
            </button>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.5rem',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>

          {/* Mobile Nav Drawer Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    zIndex: 999,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                />
                {/* Drawer Container */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '75vw',
                    maxWidth: '300px',
                    background: 'rgba(15,15,26,0.98)',
                    zIndex: 1000,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem 1.25rem',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '1.1rem' }}>Menu</span>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '0.25rem' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">Home</button>
                    <button onClick={() => { navigate('/my-orders'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">My Orders</button>
                    <button onClick={() => { navigate('/order-tracking'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">Track Order</button>
                    <button onClick={() => { navigate('/chat'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">AI Chat</button>
                    <button onClick={() => { navigate('/chat', { state: { openProfile: true } }); setMobileMenuOpen(false); }} className="mobile-drawer-btn">Profile</button>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="mobile-drawer-logout-btn"
                    >
                      Logout
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>

        <div className="error-card glass-card" style={{ zIndex: 10, marginTop: '80px', textAlign: 'center', padding: '3rem 2rem', maxWidth: '420px', width: '100%' }}>
          {noOrders ? (
            <>
              <span style={{ fontSize: '3.5rem' }}>🛵</span>
              <h2 style={{ color: 'white', marginTop: '1rem' }}>No Active Orders</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.75rem 0 1.5rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                You don't have any orders placed yet. Place your first order with our AI Chat Assistant!
              </p>
              <Link to="/chat" className="osc-confirm-btn" style={{ textDecoration: 'none', background: 'var(--brand-gradient)', display: 'inline-flex', padding: '0.8rem 1.5rem', borderRadius: '0.75rem', fontWeight: '700', color: 'white', justifyContent: 'center', width: '100%' }}>
                Order Traditional Food Now →
              </Link>
            </>
          ) : (
            <>
              <span style={{ fontSize: '3rem' }}>❌</span>
              <h2 style={{ color: 'white', marginTop: '1.5rem' }}>Tracking Error</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.75rem 0 1.5rem 0', fontSize: '0.9rem' }}>{error?.message || 'We could not load details for this Order.'}</p>
              <Link to="/chat" className="back-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#f97316', textDecoration: 'none', fontWeight: '600' }}>
                <ArrowLeft size={16} /> Return to Ordering Assistant
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-page-container">
      {/* Background canvas for moving blobs */}
      <div className="bg-canvas" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <div className="bg-overlay" aria-hidden="true" />

      {/* NAVBAR */}
      <header className="chat-header" style={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 15, 26, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="Akshaya Homely Foods Logo" className="header-logo-img" />
          Akshaya Homely Foods
        </div>

        {/* Desktop nav links */}
        <nav className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem' }}>Home</Link>
          <Link to="/my-orders" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            My Orders
          </Link>
          <Link to="/order-tracking" style={{ color: 'white', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Track Order
          </Link>
          <button onClick={handleLogout} className="new-chat-btn">
            <LogOut size={14} /> Logout
          </button>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.5rem',
            
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>

        {/* Mobile Nav Drawer Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.55)',
                  zIndex: 999,
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '75vw',
                  maxWidth: '300px',
                  background: 'rgba(15,15,26,0.98)',
                  zIndex: 1000,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem 1.25rem',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <span style={{ color: 'white', fontWeight: '700', fontSize: '1.1rem' }}>Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '0.25rem' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">Home</button>
                  <button onClick={() => { navigate('/my-orders'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">My Orders</button>
                  <button onClick={() => { navigate('/order-tracking'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">Track Order</button>
                  <button onClick={() => { navigate('/chat'); setMobileMenuOpen(false); }} className="mobile-drawer-btn">AI Chat</button>
                  <button onClick={() => { navigate('/chat', { state: { openProfile: true } }); setMobileMenuOpen(false); }} className="mobile-drawer-btn">Profile</button>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="mobile-drawer-logout-btn"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main className="tracking-content">
        <div className="tracking-grid">
          {/* Timeline Status */}
          <div className="timeline-section glass-card">
            <h3 className="section-title">📦 Order Status Timeline</h3>
            <p className="live-badge">
              <span className="live-dot" /> Live Tracking · Updates automatically
            </p>

            <div className="timeline-stepper">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;
                const isPending = idx > currentIdx;

                return (
                  <div key={idx} className={`timeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="timeline-icon-col">
                      <div className="timeline-icon-box">
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="check-icon" />
                        ) : isActive ? (
                          <span className="pulse-active-dot" />
                        ) : (
                          <Circle size={16} className="pending-icon" />
                        )}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`timeline-line ${isCompleted ? 'line-completed' : ''}`} />
                      )}
                    </div>

                    <div className="timeline-content-col">
                      <div className="timeline-step-header">
                        <span className="step-emoji">{step.icon}</span>
                        <h4 className="step-label">{step.label}</h4>
                      </div>
                      <p className="step-desc">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Summary */}
          <div className="details-section">
            <div className="details-card glass-card">
              <h3 className="section-title">🛒 Order Details</h3>
              <div className="details-row">
                <span className="details-label">Order ID</span>
                <span className="details-val highlight-val">#{order.id}</span>
              </div>
              <div className="details-row">
                <span className="details-label">Customer Name</span>
                <span className="details-val">{order.customer.name}</span>
              </div>
              <div className="details-row">
                <span className="details-label">WhatsApp Contact</span>
                <span className="details-val">{order.customer.whatsapp_number}</span>
              </div>
              <div className="details-row">
                <span className="details-label">Payment Status</span>
                <span className={`payment-status-badge ${order.payment_status.toLowerCase()}`}>
                  {order.payment_status}
                </span>
              </div>

              <div className="divider-details" />

              <h4 className="details-subtitle">Ordered Items</h4>
              <div className="items-list-container">
                {order.items.map((item, idx) => {
                  const qtyStr = String(item.quantity).toLowerCase();
                  const isWeight = qtyStr.includes('g') || qtyStr.includes('kg') || qtyStr.includes('ml') || qtyStr.includes('l');
                  return (
                    <div key={idx} className="item-tracking-row">
                      <span className="item-name-qty">• {cleanProductName(item.name)} <strong>{isWeight ? '' : 'x'}{item.quantity}</strong></span>
                      <span className="item-price-total">₹{getItemTotal(item.price, item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="divider-details" />

              <div className="details-row total-row">
                <span>Total Amount Paid</span>
                <span className="total-val">₹{order.total_amount.toFixed(2)}</span>
              </div>

              <div className="divider-details" />

              <div className="address-block">
                <span className="address-title">📍 Delivery Address</span>
                <p className="address-text">{order.delivery_address}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

