import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import CreatableSelect from "react-select/creatable";
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const CreateJob = () => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm()

    const onSubmit = async (data) => {
        if (!isAuthenticated) {
            setError('Please login to post a job');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            
            data.skills = selectedOption;
            data.postedBy = user.email;
            
            // Try new API first, fallback to legacy API
            try {
                const result = await apiService.createJob(data);
                if (result.message) {
                    alert("Job Posted Successfully");
                    reset();
                    setSelectedOption(null);
                    navigate('/');
                } else {
                    throw new Error('Failed to post job');
                }
            } catch (error) {
                // Fallback to legacy API
                const result = await apiService.postJob(data);
                if (result.acknowledged === true) {
                    alert("Job Posted Successfully");
                    reset();
                    setSelectedOption(null);
                    navigate('/');
                } else {
                    throw new Error('Failed to post job');
                }
            }
        } catch (error) {
            setError('Failed to post job. Please try again.');
            console.error('Error posting job:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const options = [
        {value: "JavaScript", label: "JavaScript"},
        {value: "HTML", label: "HTML"},
        {value: "CSS", label: "CSS"},
        {value: "DOM", label: "DOM"},
        {value: "Asynchronous Programming", label: "Asynchronous Programming"},
        {value: "React", label: "React"},
        {value: "Node.js", label: "Node.js"},
        {value: "Express.js", label: "Express.js"},
        {value: "MongoDB", label: "MongoDB"},
        {value: "SQL", label: "SQL"},
        {value: "Python", label: "Python"},
        {value: "Java", label: "Java"},
        {value: "C++", label: "C++"},
        {value: "Ruby", label: "Ruby"},
        {value: "PHP", label: "PHP"},
        {value: "Go", label: "Go"},
        {value: "Rust", label: "Rust"},
        {value: "TypeScript", label: "TypeScript"},
        {value: "Angular", label: "Angular"},
        {value: "Vue.js", label: "Vue.js"},
        {value: "Flutter", label: "Flutter"},
        {value: "React Native", label: "React Native"},
        {value: "Ionic", label: "Ionic"},
        {value: "Kotlin", label: "Kotlin"},
        {value: "Swift", label: "Swift"},
        {value: "Other", label: "Other"}
    ]

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
                    <p className="text-gray-600 mb-4">Please login to post a job</p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='max-w-screen-2xl container mx-auto xl:px-24 px-4'>
            {/* Form */}
            <div className="bg-[#FAFAFA] py-10 px-4 lg:px-16">
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
                    {/* First Row */}
                    <div className="create-job-flex">
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Job Title</label>
                            <input 
                                type="text" 
                                placeholder='Enter Job Title' 
                                defaultValue={""} 
                                {...register("jobTitle", { required: true })} 
                                className='create-job-input'
                            />
                            {errors.jobTitle && <span className="text-red-500 text-sm">Job title is required</span>}
                        </div>
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Company Name</label>
                            <input 
                                type="text" 
                                placeholder='Ex: Google' 
                                {...register("companyName", { required: true })} 
                                className='create-job-input'
                            />
                            {errors.companyName && <span className="text-red-500 text-sm">Company name is required</span>}
                        </div>
                    </div>

                    {/* 2nd Row */}
                    <div className="create-job-flex">
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Minimum Salary</label>
                            <input 
                                type="text" 
                                placeholder='Ex: 3LPA' 
                                {...register("minPrice")} 
                                className='create-job-input'
                            />
                        </div>
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Maximum Salary</label>
                            <input 
                                type="text" 
                                placeholder='Ex: 20LPA' 
                                {...register("maxPrice", { required: true })} 
                                className='create-job-input'
                            />
                            {errors.maxPrice && <span className="text-red-500 text-sm">Maximum salary is required</span>}
                        </div>
                    </div>

                    {/* Third Row */}
                    <div className="create-job-flex">
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Salary Type</label>
                            <select {...register("salaryType", { required: true })} className='create-job-input'>
                                <option value="">Choose Salary Type</option>
                                <option value="Hourly">Hourly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                            </select>
                            {errors.salaryType && <span className="text-red-500 text-sm">Salary type is required</span>}
                        </div>
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Job Location</label>
                            <input 
                                type="text" 
                                placeholder='Ex: Seattle' 
                                {...register("jobLocation", { required: true })} 
                                className='create-job-input'
                            />
                            {errors.jobLocation && <span className="text-red-500 text-sm">Job location is required</span>}
                        </div>
                    </div>

                    {/* Fourth Row */}
                    <div className="create-job-flex">
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Job Posting Date</label>
                            <input 
                                type="date" 
                                placeholder='Ex: 24-05-30' 
                                {...register("postingDate")} 
                                className='create-job-input'
                            />
                        </div>
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Experience Level</label>
                            <select {...register("experienceLevel", { required: true })} className='create-job-input'>
                                <option value="">Choose Experience Type</option>
                                <option value="Fresher/No Experience">Fresher</option>
                                <option value="Internship">Internship</option>
                                <option value="Remote Work">Experienced</option>
                            </select>
                            {errors.experienceLevel && <span className="text-red-500 text-sm">Experience level is required</span>}
                        </div>
                    </div>

                    {/* Fifth Row */}
                    <div className="">
                        <label className='block mb-2 text-lg'>Required Skill Sets</label>
                        <CreatableSelect
                            defaultValue={selectedOption}
                            onChange={setSelectedOption}
                            options={options}
                            isMulti
                            className='create-job-input py-4'
                        />
                    </div>

                    {/* Sixth Row */}
                    <div className="create-job-flex">
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Company Logo</label>
                            <input 
                                type="url" 
                                placeholder='Ex: Your Company Logo URL' 
                                {...register("companyLogo")} 
                                className='create-job-input'
                            />
                        </div>
                        <div className="lg:w-1/2 w-full">
                            <label className='block mb-2 text-lg'>Employment Type</label>
                            <select {...register("employmentType", { required: true })} className='create-job-input'>
                                <option value="">Choose Employment Type</option>
                                <option value="Full-Time">Full-Time</option>
                                <option value="Part-Time">Part-Time</option>
                                <option value="Temporary">Temporary</option>
                            </select>
                            {errors.employmentType && <span className="text-red-500 text-sm">Employment type is required</span>}
                        </div>
                    </div>

                    {/* 7th Row */}
                    <div className="w-full">
                        <label className='block mb-2 text-lg'>Job Description</label>
                        <textarea 
                            className='w-full pl-3 py-1.5 focus:outline-none placeholder:text-gray-700' 
                            rows={6}
                            defaultValue={""}
                            placeholder='Enter Job Description'
                            {...register("description", { required: true })}
                            style={{ resize: 'none' }}
                        />
                        {errors.description && <span className="text-red-500 text-sm">Job description is required</span>}
                    </div>

                    <input 
                        type="submit" 
                        value={isSubmitting ? "Posting Job..." : "Post Job"}
                        disabled={isSubmitting}
                        className='block bg-blue text-white font-semibold px-8 py-2 rounded-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    />
                </form>
            </div>
        </div>
    )
}

export default CreateJob
