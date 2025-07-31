import { useEffect, useState } from "react";
import Banner from "../../components/Banner"
import Card from "../../components/Card";
import Jobs from "./Jobs";
import Sidebar from "../../sidebar/Sidebar";
import Newsletter from "../../components/Newsletter";
import { apiService } from "../../services/api";

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchJobs();
  }, [currentPage]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try new API first, fallback to legacy API
      try {
        const response = await apiService.getJobs({
          page: currentPage,
          limit: itemsPerPage
        });
        
        if (response.jobs) {
          setJobs(response.jobs);
          setTotalPages(response.totalPages || 1);
        } else {
          // Fallback to legacy API
          const legacyJobs = await apiService.getAllJobs();
          setJobs(legacyJobs);
          setTotalPages(Math.ceil(legacyJobs.length / itemsPerPage));
        }
      } catch (error) {
        // Fallback to legacy API
        const legacyJobs = await apiService.getAllJobs();
        setJobs(legacyJobs);
        setTotalPages(Math.ceil(legacyJobs.length / itemsPerPage));
      }
    } catch (error) {
      setError('Failed to fetch jobs. Please try again later.');
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [query, setQuery] = useState("");
  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }

  // FILTER JOBS BY TITLE
  const filteredItems = jobs.filter((job) => job.jobTitle.toLowerCase().indexOf(query.toLowerCase()) !== -1)

  // Radio Filtering
  const handleChange = (event) => {
    setSelectedCategory(event.target.value)
  }

  // Button based Filtering
  const handleClick = (event) => {
    setSelectedCategory(event.target.value)
  }

  //Calculate the index range
  const calculatePageRange = () => {
    const startIndex = (currentPage -1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {startIndex, endIndex};
  }

  // Function for the next page
  const nextPage = () => {
    if (currentPage < totalPages){
      setCurrentPage(currentPage + 1);
    }
  }

  // Function for the previous page
  const prevPage = () => {
    if(currentPage > 1){
      setCurrentPage(currentPage - 1)
    }
  }

  //Main Function
  const filteredData = (jobs, selected, query) => {
    let filteredJobs = jobs;

    //Filtering Input Items
    if(query){
      filteredJobs = filteredItems;
    }

    //Category Filtering
    if(selected) {
      filteredJobs = filteredJobs.filter(({jobLocation, maxPrice, experienceLevel, salaryType, employmentType, postingDate,
      }) =>
        jobLocation.toLowerCase() === selected.toLowerCase() ||
        parseInt(maxPrice) <= parseInt(selected) ||
        postingDate >= selected ||
        salaryType.toLowerCase() === selected.toLowerCase() ||
        experienceLevel.toLowerCase() === selected.toLowerCase() ||
        employmentType.toLowerCase() === selected.toLowerCase()
      );
    }

    // Slice the data based on current page
    const {startIndex, endIndex} = calculatePageRange();
    filteredJobs = filteredJobs.slice(startIndex, endIndex)

    return filteredJobs.map((data, i) => <Card key={i} data={data}/>)
  }

  const result = filteredData(jobs, selectedCategory, query);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchJobs}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Banner query={query} handleInputChange={handleInputChange} />
    
      {/* Main Content */}
      <div className="bg-[#FAFAFA] md:grid grid-cols-4 gap-8 lg:px-24 px-4 py-12">
        {/* Left Side */}
        <div className="bg-white p-4 rounded">
          <Sidebar handleChange={handleChange} handleClick={handleClick}/>
        </div>

        {/* Jobs Cards */}
        <div className="col-span-2 bg-white p-4 rounded-sm"> 
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading jobs...</span>
            </div>
          ) : result.length > 0 ? (
            <Jobs result={result}/>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-lg font-bold mb-2">No Jobs Found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or check back later.</p>
            </div>
          )}

          {/* PAGINATION */}
          {result.length > 0 && !isLoading && (
            <div className="flex justify-center mt-4 space-x-8">
              <button 
                onClick={prevPage} 
                disabled={currentPage === 1} 
                className="hover:underline font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="mx-2">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={nextPage} 
                disabled={currentPage === totalPages} 
                className="hover:underline font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="bg-white p-4 rounded">
          <Newsletter/>
        </div>
      </div>
    </div>
  )
}

export default Home
