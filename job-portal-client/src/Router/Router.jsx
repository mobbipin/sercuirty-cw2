import {createBrowserRouter} from "react-router-dom";
import App from "../App";
import Home from "../assets/Pages/Home";
import About from "../assets/Pages/About";
import CreateJob from "../assets/Pages/CreateJob";
import MyJobs from "../assets/Pages/MyJobs";
import SalaryPage from "../assets/Pages/SalaryPage";
import UpdateJob from "../assets/Pages/UpdateJob";
import Login from "../components/Login";
import JobDetails from "../assets/Pages/JobDetails";
import Signup from "../components/Signup";
import ResetPassword from "../components/ResetPassword";
import SecurityDashboard from "../components/SecurityDashboard";

const router = createBrowserRouter([
    {
      path: "/",
      element: <App/>,
      children: [
        {path: "/", element: <Home/>},
        {
          path: "/post-job",
          element: <CreateJob/>
        },
        
        {
          path: "/my-job",
          element: <MyJobs/>
        },
        {
          path: "/salary",
          element: <SalaryPage/>
        },
        {
          path: "/edit-job/:id",
          element: <UpdateJob/>,
          loader: ({params}) => fetch(`http://localhost:5001/all-jobs/${params.id}`)
        },
        {
          path: "/job/:id",
          element: <JobDetails/>
        },
        {
          path: "/login",
          element: <Login/>
        },
        {
          path: "/sign-up",
          element: <Signup/>
        },
        {
          path: "/reset-password",
          element: <ResetPassword/>
        },
        {
          path: "/security-dashboard",
          element: <SecurityDashboard/>
        }
      ],
    }
  ]);

  export default router;
