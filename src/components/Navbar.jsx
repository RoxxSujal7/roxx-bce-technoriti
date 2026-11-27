import { useState, useEffect } from "react";
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import './Navbar.scss';
import { BsInstagram, BsLinkedin } from "react-icons/bs";
import { FaTwitter, FaYoutube } from "react-icons/fa";
import { isMobile } from "react-device-detect";

import logo from "../assets/synergy-nav.svg";
import { useAuth } from "../context/AuthContext";

const NavigationBar = () => {
    const [colorChange, setColorchange] = useState(false);
    const { session, profile } = useAuth();
    const isStaff = profile?.role && ["super_admin", "admin", "coordinator"].includes(profile.role);

    useEffect(() => {
        const changeNavbarColor = () => {
            if (window.scrollY >= 80 || isMobile || window.innerWidth <= 767) {
                setColorchange(true);
            } else {
                setColorchange(false);
            }
        };

        changeNavbarColor();
        window.addEventListener('scroll', changeNavbarColor);
        window.addEventListener('resize', changeNavbarColor);

        return () => {
            window.removeEventListener('scroll', changeNavbarColor);
            window.removeEventListener('resize', changeNavbarColor);
        };
    }, []);

    return (
        <>
            <Navbar variant="dark" expand="md" className={colorChange ? 'navbar-main navbar_black' : 'navbar-main navbar-transparent'} fixed="top">
                <Container fluid>
                    <Navbar.Brand href="#/" className="nav-item d-flex align-items-center" id="nav-logo">
                        <img src={logo} className="navlogo me-2" alt="TECHNORITI '26 Logo" style={{ width: "auto", height: "38px" }} />
                        <div className="d-flex flex-column brand-text-wrap" style={{ lineHeight: "1.1" }}>
                            <span className="brand-title" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "1.15rem", letterSpacing: "1px", color: "#ffffff" }}>
                                TECHNORITI <span style={{ color: "#e879f9" }}>'26</span>
                            </span>
                            <span className="brand-subtitle" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.62rem", letterSpacing: "1.5px", color: "rgba(255, 255, 255, 0.78)", marginTop: "2px" }}>
                                BCE BHAGALPUR
                            </span>
                        </div>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbarScroll" />
                    <Navbar.Collapse id="navbarScroll">
                        <Nav
                            className="me-auto my-2 my-lg-0"
                            style={{ maxHeight: '100px' }}
                            navbarScroll
                        >
                            <Nav.Link href="#/" className="nav-item">Home</Nav.Link>
                            <Nav.Link href="#/events" className="nav-item">Events</Nav.Link>
                            <Nav.Link href="#/team" className="nav-item">Team</Nav.Link>
                            {!session && <Nav.Link href="#/admin-login" className="nav-item">Admin Login</Nav.Link>}
                            {session && <Nav.Link href="#/dashboard" className="nav-item">Dashboard</Nav.Link>}
                            {isStaff && <Nav.Link href="#/admin" className="nav-item" style={{ color: "#e879f9" }}>Admin</Nav.Link>}
                        </Nav>
                        <div className="d-flex align-items-center">
                            <span className="nav-icons">
                                <a href="https://twitter.com/bce_bhagalpur" target="_blank" rel="noopener noreferrer" title="Twitter / X" aria-label="Twitter / X">
                                    <FaTwitter style={{ fontSize: "1.3em" }} className='navbar-social-icons' aria-hidden="true" />
                                </a>
                            </span>
                            <span className="nav-icons">
                                <a href="https://instagram.com/bcebhagalpur_official" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram">
                                    <BsInstagram style={{ fontSize: "1.3em" }} className='navbar-social-icons' aria-hidden="true" />
                                </a>
                            </span>
                            <span className="nav-icons">
                                <a href="https://linkedin.com/in/bhagalpur-college-of-engineering-897354228" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn">
                                    <BsLinkedin style={{ fontSize: "1.3em" }} className='navbar-social-icons' aria-hidden="true" />
                                </a>
                            </span>
                            <span className="nav-icons">
                                <a href="https://www.youtube.com/@bcebhagalpurofficial" target="_blank" rel="noopener noreferrer" title="YouTube" aria-label="YouTube">
                                    <FaYoutube style={{ fontSize: "1.3em" }} className='navbar-social-icons' aria-hidden="true" />
                                </a>
                            </span>
                        </div>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </>
    );
};

export default NavigationBar;
