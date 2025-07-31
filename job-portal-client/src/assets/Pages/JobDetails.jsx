import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import PageHeader from '../../components/PageHeader'
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiClock, FiDollarSign, FiMapPin, FiHome, FiUser, FiMail } from 'react-icons/fi';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        fetchJobDetails();
    }, [id]);

    const fetchJobDetails = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Try new API first, fallback to legacy API
            try {
                const data = await apiService.getJob(id);
                if (data.message === 'Job not found') {
                    throw new Error('Job not found');
                }
                setJob(data);
            } catch (error) {
                // Fallback to legacy API
                const data = await apiService.getJobById(id);
                setJob(data);
            }
        } catch (error) {
            setError('Failed to fetch job details');
            console.error('Error fetching job:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async () => {
        if (!isAuthenticated) {
            Swal.fire({
                icon: 'warning',
                title: 'Authentication Required',
                text: 'Please login to apply for this job',
                confirmButtonText: 'Go to Login',
                showCancelButton: true,
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate('/login');
                }
            });
            return;
        }

        try {
            setIsApplying(true);
            
            const { value: resumeLink } = await Swal.fire({
                title: 'Apply for Job',
                input: 'url',
                inputLabel: 'Resume Link',
                inputPlaceholder: 'Enter your resume URL (Google Drive, Dropbox, etc.)',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Please enter a resume link';
                    }
                    if (!value.startsWith('http')) {
                        return 'Please enter a valid URL';
                    }
                },
                showCancelButton: true,
                confirmButtonText: 'Apply',
                cancelButtonText: 'Cancel',
                showLoaderOnConfirm: true,
                preConfirm: async (resumeLink) => {
                    try {
                        const applicationData = {
                            jobId: id,
                            applicantEmail: user.email,
                            applicantName: user.displayName || user.email.split('@')[0],
                            resumeLink: resumeLink,
                            coverLetter: ''
                        };
                        
                        const result = await apiService.submitApplication(applicationData);
                        return result;
                    } catch (error) {
                        Swal.showValidationMessage(`Application failed: ${error.message}`);
                    }
                },
                allowOutsideClick: () => !Swal.isLoading()
            });

            if (resumeLink) {
                Swal.fire({
                    icon: 'success',
                    title: 'Application Submitted!',
                    text: 'Your application has been successfully submitted. We will contact you soon.',
                });
            }
        } catch (error) {
            console.error('Error applying:', error);
        } finally {
            setIsApplying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="text-gray-600">Loading job details...</span>
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-600 mb-4">{error || 'Job not found'}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Back to Jobs
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-screen-2xl container mx-auto xl:px-24 px-4">
            <PageHeader title="Job Details" path="Job Details" />
            
            <div className="pt-8">
                {/* Job Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            {job.companyLogo && (
                                <img 
                                    src={job.companyLogo} 
                                    alt={job.companyName}
                                    className="w-16 h-16 rounded-lg object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    {job.jobTitle}
                                </h1>
                                <div className="flex items-center space-x-4 text-gray-600">
                                    <div className="flex items-center space-x-1">
                                        <FiHome className="w-4 h-4" />
                                        <span>{job.companyName}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <FiMapPin className="w-4 h-4" />
                                        <span>{job.jobLocation}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleApply}
                            disabled={isApplying}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isApplying ? 'Applying...' : 'Apply Now'}
                        </button>
                    </div>

                    {/* Job Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <div className="flex items-center space-x-2 text-gray-600">
                            <FiDollarSign className="w-5 h-5" />
                            <span>${job.minPrice} - ${job.maxPrice} {job.salaryType}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                            <FiClock className="w-5 h-5" />
                            <span>{job.employmentType}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                            <FiUser className="w-5 h-5" />
                            <span>{job.experienceLevel}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                            <FiCalendar className="w-5 h-5" />
                            <span>Posted: {new Date(job.postingDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Job Description */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {job.description}
                    </p>
                </div>

                {/* Skills Required */}
                {job.skills && job.skills.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Required Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill, index) => (
                                <span 
                                    key={index}
                                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Company Info */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">About {job.companyName}</h2>
                    <p className="text-gray-700">
                        {job.companyName} is looking for talented individuals to join their team. 
                        This is an exciting opportunity to work with cutting-edge technologies and 
                        be part of a dynamic and innovative company.
                    </p>
                </div>

                {/* Apply Section */}
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Ready to Apply?
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Submit your application and take the next step in your career
                    </p>
                    <button 
                        onClick={handleApply}
                        disabled={isApplying}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isApplying ? 'Applying...' : 'Apply for this Position'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
