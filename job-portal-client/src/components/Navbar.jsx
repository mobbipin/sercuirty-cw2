import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom';
import {FaBarsStaggered, FaXmark} from "react-icons/fa6";
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    
    const handleMenuToggler = () => {
        setIsMenuOpen(!isMenuOpen)
    }

    const handleLogout = async () => {
        try {
            await logout();
            setIsMenuOpen(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    const navItems = [
        {path: "/", title: "Start a Search"},
        {path: "/my-job", title: "My Jobs"},
        {path: "/salary", title: "Salary Estimate"},
        {path: "/post-job", title: "Post a Job"},
    ]

    return (
        <header className='max-w-screen container mx-auto xl:px-24 px-4'>
            <nav className="flex justify-between items-center py-6">
                <a href="/" className="flex items-center gap-2 text-2xl text-black">
                    
                    <span className="">getSomeJob</span>
                </a>

                {/* {NAV ITEMS FOR LARGE DEVICES} */}
                <ul className="hidden md:flex gap-12">
                    {
                        navItems.map(({path, title}) => (
                            <li key={path} className="text-base text-primary">
                                <NavLink
                                to={path}
                        className={({ isActive}) => isActive ? "active": "" }
                      >
                        {title}
                                </NavLink>
                            </li>
                        ))
                    }
                </ul>

                {/* SIGNUP AND LOGIN BUTTON */}
                <div className="text-base text-primary font-medium space-x-5 hidden lg:block">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                                Welcome, {user?.name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <button 
                                onClick={handleLogout}
                                className='py-2 px-5 border rounded bg-red-500 text-white hover:bg-red-600'
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link to = "/login" className='py-2 px-5 border rounded'>Login</Link>
                            <Link to = "/sign-up" className='py-2 px-5 border rounded bg-blue text-white'>Sign up</Link>
                        </>
                    )}
                </div>

                {/* MOBILE MENU */}
                <div className="md:hidden block">
                    <button onClick={handleMenuToggler}>
                        {
                            isMenuOpen ? <FaXmark className='w-5 h-5 text-primary'/> : <FaBarsStaggered className='w-5 h-5 text-primary'/>
                        }
                    </button>
                </div>
            </nav>

            {/* NAV ITEMS FOR MOBILE */}
            <div className={`px-4 bg-black py-5 rounded-sm ${isMenuOpen ? "" : "hidden"}`}>
                <ul className="">
                    {navItems.map(({path, title}) => (
                        <li key={path} className="text-base text-white first:text-white py-1 px-5 hover:text-[#00DDFF]">
                            <NavLink
                                to={path}
                                className={({ isActive}) => isActive ? "active": "" }
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {title}
                            </NavLink>
                        </li>
                    ))}

                    {isAuthenticated ? (
                        <>
                            <li className="text-white py-1 px-5">
                                <span className="text-sm">
                                    Welcome, {user?.name || user?.email?.split('@')[0] || 'User'}
                                </span>
                            </li>
                            <li className="text-white py-1 px-5">
                                <button 
                                    onClick={handleLogout}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li className="text-white py-1 px-5">
                                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                                    Login
                                </Link>
                            </li>
                            <li className="text-white py-1 px-5">
                                <Link to="/sign-up" onClick={() => setIsMenuOpen(false)}>
                                    Sign up
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </header>
    )
}

export default Navbar
