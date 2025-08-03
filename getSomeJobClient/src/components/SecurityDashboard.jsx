import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const SecurityDashboard = () => {
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    suspiciousEvents: 0,
    failedLogins: 0,
    successfulLogins: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'employer') {
      fetchSecurityEvents();
    }
  }, [user]);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/security/events', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSecurityEvents(data.events || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'LOGIN_FAILED':
        return '🔴';
      case 'SUSPICIOUS_REQUEST':
        return '🚨';
      case 'LOGIN_SUCCESS':
        return '🟢';
      case 'PASSWORD_RESET_REQUESTED':
        return '🔑';
      case 'USER_REGISTRATION':
        return '👤';
      default:
        return 'ℹ️';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'LOGIN_FAILED':
      case 'SUSPICIOUS_REQUEST':
        return 'bg-red-50 border-red-200';
      case 'LOGIN_SUCCESS':
        return 'bg-green-50 border-green-200';
      case 'PASSWORD_RESET_REQUESTED':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!user || user.role !== 'employer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor security events and system activity</p>
        </div>

        {/* Security Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Events</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <span className="text-2xl">🚨</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suspicious Events</p>
                <p className="text-2xl font-semibold text-red-600">{stats.suspiciousEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <span className="text-2xl">🔴</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed Logins</p>
                <p className="text-2xl font-semibold text-red-600">{stats.failedLogins}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">🟢</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Successful Logins</p>
                <p className="text-2xl font-semibold text-green-600">{stats.successfulLogins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Events */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Security Events</h2>
              <button
                onClick={fetchSecurityEvents}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {securityEvents.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No security events found
              </div>
            ) : (
              securityEvents.map((event, index) => (
                <div key={index} className={`px-6 py-4 ${getEventColor(event.eventType)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-xl">{getEventIcon(event.eventType)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {event.eventType.replace(/_/g, ' ')}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.details?.email || event.details?.ip || 'System Event'}
                        </p>
                        {event.details?.userAgent && (
                          <p className="text-xs text-gray-500 mt-1">
                            {event.details.userAgent}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {event.ip}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard; 