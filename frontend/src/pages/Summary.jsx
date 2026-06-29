import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchSummaryToday } from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { cleanProductName } from '../utils/format';

export default function Summary() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summaryToday'],
    queryFn: fetchSummaryToday,
    refetchInterval: 3000,
  });

  const summary = data?.summary || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, deliveredOrders: 0 };
  const chartData = data?.hourlyChart || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar title="Daily Summary" />

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="card stat-card">
            <span className="stat-label">Total Orders Today</span>
            {isLoading ? (
              <div className="skeleton skeleton-title" style={{ height: '2rem', width: '50px', marginTop: '0.25rem' }} />
            ) : (
              <span className="stat-value">{summary.totalOrders}</span>
            )}
          </div>

          <div className="card stat-card stat-accent">
            <span className="stat-label">Total Revenue Today</span>
            {isLoading ? (
              <div className="skeleton skeleton-title" style={{ height: '2rem', width: '100px', marginTop: '0.25rem' }} />
            ) : (
              <span className="stat-value">₹{summary.totalRevenue}</span>
            )}
          </div>

          <div className="card stat-card">
            <span className="stat-label">Pending Orders</span>
            {isLoading ? (
              <div className="skeleton skeleton-title" style={{ height: '2rem', width: '50px', marginTop: '0.25rem' }} />
            ) : (
              <span className="stat-value">{summary.pendingOrders}</span>
            )}
          </div>

          <div className="card stat-card stat-accent">
            <span className="stat-label">Delivered Orders</span>
            {isLoading ? (
              <div className="skeleton skeleton-title" style={{ height: '2rem', width: '50px', marginTop: '0.25rem' }} />
            ) : (
              <span className="stat-value">{summary.deliveredOrders}</span>
            )}
          </div>
        </div>

        {/* Chart Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '360px' }}>
          <h3 style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.125rem' }}>Orders by Hour (Today)</h3>
          {isLoading ? (
            <div className="skeleton" style={{ flex: 1, borderRadius: 'var(--radius-md)', minHeight: '250px' }} />
          ) : isError ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              Failed to load daily chart data.
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEF" />
                  <XAxis dataKey="hour" stroke="#7A7265" fontSize={11} tickLine={false} />
                  <YAxis stroke="#7A7265" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px'
                    }}
                    cursor={{ fill: 'rgba(123, 13, 13, 0.02)' }}
                  />
                  <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Orders Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.125rem' }}>Recent 5 Orders</h3>
          
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx}>
                      <td><div className="skeleton skeleton-text" style={{ width: '30px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '90px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '160px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '50px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '70px', borderRadius: '50px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '80px', borderRadius: '50px' }} /></td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--danger)', padding: '1rem' }}>
                      Error loading recent orders list.
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No orders recorded today.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: '700' }}>#{order.id}</td>
                      <td style={{ fontWeight: '500' }}>{order.customer.name}</td>
                      <td>
                        {order.items.map((item, i) => {
                          const qtyStr = String(item.quantity).toLowerCase();
                          const isWeight = qtyStr.includes('g') || qtyStr.includes('kg');
                          return (
                            <span key={i} style={{ fontSize: '0.8rem', marginRight: '0.75rem', background: '#F1EFEF', padding: '2px 6px', borderRadius: '4px' }}>
                              {cleanProductName(item.name)} ({isWeight ? '' : 'x'}{item.quantity})
                            </span>
                          );
                        })}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{order.total_amount}</td>
                      <td>
                        <span className={`badge badge-${order.payment_status.toLowerCase()}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${order.order_status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {order.order_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
