const API_BASE_URL = 'http://localhost:3000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API service functions
export const apiService = {
  // Authentication
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return data;
    } catch (error) {
      throw new Error('Failed to login');
    }
  },

  async logout() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to logout');
    }
  },

  async getProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get profile');
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  },

  // User management
  async createUser(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to create user');
    }
  },

  async getUser(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${email}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get user');
    }
  },

  // Job management
  async getJobs(params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/api/jobs?${queryParams}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch jobs');
    }
  },

  async getJob(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch job');
    }
  },

  async createJob(jobData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(jobData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to create job');
    }
  },

  async updateJob(id, jobData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(jobData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to update job');
    }
  },

  async deleteJob(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to delete job');
    }
  },

  async getUserJobs(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/user/${email}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch user jobs');
    }
  },

  // Application management
  async submitApplication(applicationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(applicationData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to submit application');
    }
  },

  async getJobApplications(jobId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/job/${jobId}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch job applications');
    }
  },

  async getUserApplications(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/applicant/${email}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch user applications');
    }
  },

  async updateApplicationStatus(id, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to update application status');
    }
  },

  // Legacy endpoints for backward compatibility
  async getAllJobs() {
    try {
      const response = await fetch(`${API_BASE_URL}/all-jobs`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch all jobs');
    }
  },

  async getJobById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/all-jobs/${id}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch job by ID');
    }
  },

  async postJob(jobData) {
    try {
      const response = await fetch(`${API_BASE_URL}/post-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to post job');
    }
  },

  async getMyJobs(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/myJobs/${email}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch my jobs');
    }
  },

  async deleteJobById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/job/${id}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to delete job');
    }
  },

  async updateJobById(id, jobData) {
    try {
      const response = await fetch(`${API_BASE_URL}/update-job/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to update job');
    }
  },
}; 