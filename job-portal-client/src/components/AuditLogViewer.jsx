import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiActivity, FiFilter, FiDownload } from 'react-icons/fi';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    dateRange: '7d',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, currentPage]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters
      });

      const response = await fetch(`http://localhost:5001/api/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const actionColors = {
      'LOGIN_SUCCESS': 'text-green-600 bg-green-100',
      'LOGIN_FAILED': 'text-red-600 bg-red-100',
      'LOGOUT': 'text-gray-600 bg-gray-100',
      'USER_REGISTRATION': 'text-blue-600 bg-blue-100',
      'EMAIL_VERIFICATION': 'text-purple-600 bg-purple-100',
      'PASSWORD_CHANGED': 'text-orange-600 bg-orange-100',
      'PASSWORD_RESET_REQUESTED': 'text-yellow-600 bg-yellow-100',
      'PASSWORD_RESET_COMPLETED': 'text-green-600 bg-green-100',
      'PROFILE_UPDATED': 'text-indigo-600 bg-indigo-100',
      'JOB_CREATED': 'text-green-600 bg-green-100',
      'JOB_UPDATED': 'text-blue-600 bg-blue-100',
      'JOB_DELETED': 'text-red-600 bg-red-100',
      'APPLICATION_SUBMITTED': 'text-purple-600 bg-purple-100',
      'APPLICATION_STATUS_UPDATED': 'text-orange-600 bg-orange-100'
    };
    return actionColors[action] || 'text-gray-600 bg-gray-100';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActionIcon = (action) => {
    const actionIcons = {
      'LOGIN_SUCCESS': '🔓',
      'LOGIN_FAILED': '❌',
      'LOGOUT': '🚪',
      'USER_REGISTRATION': '👤',
      'EMAIL_VERIFICATION': '✉️',
      'PASSWORD_CHANGED': '🔐',
      'PASSWORD_RESET_REQUESTED': '📧',
      'PASSWORD_RESET_COMPLETED': '✅',
      'PROFILE_UPDATED': '✏️',
      'JOB_CREATED': '➕',
      'JOB_UPDATED': '🔄',
      'JOB_DELETED': '🗑️',
      'APPLICATION_SUBMITTED': '📝',
      'APPLICATION_STATUS_UPDATED': '📊'
    };
    return actionIcons[action] || '📋';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User ID', 'Action', 'Details', 'IP Address', 'User Agent'],
      ...logs.map(log => [
        formatDate(log.timestamp),
        log.userId,
        log.action,
        JSON.stringify(log.details),
        log.ipAddress,
        log.userAgent
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <FiActivity className="text-2xl text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiDownload className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGIN_FAILED">Login Failed</option>
            <option value="LOGOUT">Logout</option>
            <option value="USER_REGISTRATION">User Registration</option>
            <option value="EMAIL_VERIFICATION">Email Verification</option>
            <option value="PASSWORD_CHANGED">Password Changed</option>
            <option value="PASSWORD_RESET_REQUESTED">Password Reset Requested</option>
            <option value="PASSWORD_RESET_COMPLETED">Password Reset Completed</option>
            <option value="PROFILE_UPDATED">Profile Updated</option>
            <option value="JOB_CREATED">Job Created</option>
            <option value="JOB_UPDATED">Job Updated</option>
            <option value="JOB_DELETED">Job Deleted</option>
            <option value="APPLICATION_SUBMITTED">Application Submitted</option>
            <option value="APPLICATION_STATUS_UPDATED">Application Status Updated</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <input
            type="text"
            value={filters.userId}
            onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            placeholder="Enter user ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search in details..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <FiUser className="w-4 h-4 text-gray-400" />
                    <span className="font-mono text-xs">{log.userId}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getActionIcon(log.action)}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate">
                    {typeof log.details === 'object' ? (
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : (
                      <span>{log.details}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-mono text-xs">{log.ipAddress}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="text-center py-12">
          <FiActivity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or date range.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer; 