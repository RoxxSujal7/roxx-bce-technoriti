// Technoriti '26 - Complete 29 Competitions Source of Truth Dataset
// Provenance: Sourced directly from https://technoriti-nine.vercel.app/ (window.TechnoritiDB)

export const competitionsList = [
    {
        id: "robowar",
        numId: "1",
        title: "RoboWar",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "The ultimate combat battle arena. Build a wired/wireless combat bot capable of overpowering, flipping, or knocking opponents into arena hazards.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "10:00 AM",
        venue: "Robotics Arena, BCE Bhagalpur",
        coordinator: "Shubham Thakur / Vinit Kumar",
        coordinator_phone: "9166344621 / 8302534925",
        faqques: [
            "What are the robot specifications and weight limits?",
            "What weapons and power sources are permitted?",
            "What is the match duration and judging criteria?"
        ],
        faqans: [
            "Maximum bot weight is 10 kg (excluding controller). Maximum dimensions: 60 cm x 60 cm x 60 cm. Wireless or wired control with minimum 5m cable.",
            "Permitted weapons: Lifters, wedges, spinners, flippers. Prohibited: Liquid projectiles, jamming devices, high-voltage tasers, untethered explosives.",
            "Matches consist of 3-minute rounds. Points awarded for aggression, damage inflicted, control, and ring-outs. Arena hazards include flame pits and flipper plates."
        ]
    },
    {
        id: "robosoccer",
        numId: "2",
        title: "RoboSoccer",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Design an agile soccer bot with pushing/hitting mechanisms to score goals and defend against rival machines on an artificial turf pitch.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "11:00 AM",
        venue: "Indoor Sports Complex, BCE Bhagalpur",
        coordinator: "Md. Aman Ansari / Madan Kumar Jha",
        coordinator_phone: "9546684329 / 7360983955",
        faqques: [
            "What are the ball and bot specifications?",
            "What is the tournament match structure?",
            "Are grabbing or holding mechanisms allowed?"
        ],
        faqans: [
            "Standard tennis/golf size ball. Bot weight limit: 5 kg; maximum size: 30 cm x 30 cm x 30 cm; operating voltage up to 12V DC.",
            "Knockout matches of two 4-minute halves with a 1-minute halftime break. Tie-breakers decided via golden goal penalty shootouts.",
            "Bots may push, kick, or flick the ball, but suction or full entrapment holding the ball for more than 3 seconds is prohibited."
        ]
    },
    {
        id: "dhanush",
        numId: "3",
        title: "Dhanush – LFR",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Autonomous line-following robot challenge inspired by the Gandiv bow concept, navigating sharp curves, hairpin bends, intersections, and checkpoints.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "10:30 AM",
        venue: "ECE Lab Hall, BCE Bhagalpur",
        coordinator: "Manish Kumar / Saurav Singh",
        coordinator_phone: "9523338938 / 8340488701",
        faqques: [
            "What track width and sensor configurations are used?",
            "What is the penalty for straying off the track?",
            "Can microcontrollers like Arduino or ESP32 be used?"
        ],
        faqans: [
            "Black lines of 3 cm width on a white matte flex surface. Bots may use IR sensor arrays, phototransistors, or camera vision.",
            "Time penalties of +5 seconds applied per checkpoint reset (maximum 3 manual resets allowed per run).",
            "Yes, any autonomous onboard microcontrollers (Arduino, STM32, ESP32, Raspberry Pi Pico) are permitted. No remote control allowed."
        ]
    },
    {
        id: "matsya",
        numId: "4",
        title: "Matsya – AquaBot",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Aquatic robotics event navigating through floating hurdles while retrieving targeted balls in the open water arena.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹200 / team",
        event_date: "December 2026",
        event_time: "02:00 PM",
        venue: "College Lake Arena, BCE Bhagalpur",
        coordinator: "Varun Singh / Deepankar Pandey",
        coordinator_phone: "9334634930 / 9102977705",
        faqques: [
            "What water depth and arena conditions should be expected?",
            "What waterproofing standards are required?",
            "How is scoring calculated?"
        ],
        faqans: [
            "Calm water arena with 1.5m to 2.5m depth with stationary and swinging buoys as navigation gates.",
            "All electrical components, ESCs, motors, and batteries must be IP67 water-sealed. Tethered or 2.4GHz RF control allowed.",
            "Scoring combines course completion time and target collection points minus gate collision penalties."
        ]
    },
    {
        id: "electrotechnovation",
        numId: "5",
        title: "ElectroTechnovation",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Flagship embedded system circuit innovation arena solving real-world automation, energy, and smart technology challenges.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "11:00 AM",
        venue: "Electrical Engineering Block",
        coordinator: "Ranjan Kumar / Sudhanshu",
        coordinator_phone: "8210355418 / 9304193615",
        faqques: [
            "What types of circuit projects can be demonstrated?",
            "Will AC power and testing instruments be provided?",
            "What is the judging criteria?"
        ],
        faqans: [
            "Power electronics, green energy converters, smart IoT sensors, industrial automated controllers, and healthcare gadgets.",
            "230V AC supplies, digital multimeters, regulated DC supplies, and oscilloscopes are available upon request.",
            "Innovation (30%), technical implementation (30%), practical scalability (20%), and live demonstration (20%)."
        ]
    },
    {
        id: "arduino",
        numId: "6",
        title: "Arduino Effect",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Design responsive embedded hardware solutions on microcontrollers with real-time sensors, LCD displays and actuation.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "01:30 PM",
        venue: "IoT & Embedded Lab, BCE Bhagalpur",
        coordinator: "Gaurav Kumar / Amit Kumar",
        coordinator_phone: "9341490218 / 7488924045",
        faqques: [
            "What problem statement will be given?",
            "Can external libraries and custom sensors be used?",
            "What are the submission deliverables?"
        ],
        faqans: [
            "A real-time automation problem statement will be unveiled at the start of the round with a 3-hour build window.",
            "Open-source Arduino IDE libraries and standard sensor modules (ultrasonic, PIR, DHT, relays, OLED) are permitted.",
            "Working circuit breadboard/PCB prototype, clean commented C++ code, and live jury demonstration."
        ]
    },
    {
        id: "boatmaking",
        numId: "7",
        title: "Boat Making Challenge",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Fabricate buoyant, streamlined boats powered by small electric motors to race along a straight water track with fastest sprint times.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "03:00 PM",
        venue: "Hydraulics Laboratory, BCE Bhagalpur",
        coordinator: "Ashish Kumar / Suraj Kumar",
        coordinator_phone: "7903456789 / 9876543210",
        faqques: [
            "What materials are allowed for the hull?",
            "What propulsion motor is allowed?",
            "How long is the race track?"
        ],
        faqans: [
            "Foam board, balsa wood, lightweight 3D-printed plastics, thermocol, and acrylic.",
            "DC electric toy motors powered by batteries up to 9V. Internal combustion engines are prohibited.",
            "10-meter straight water trough with automated laser tripwire timers at the finish line."
        ]
    },
    {
        id: "electronicsproject",
        numId: "8",
        title: "Electronics Project Exhibition",
        category: "Robotics & Hardware",
        category_id: "robotics",
        imgsrc: "/rect55.png",
        desc: "Demonstrate innovative working hardware prototypes, embedded IoT devices, and automation models to academic & industry juries.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "10:00 AM",
        venue: "Central Seminar Hall, BCE Bhagalpur",
        coordinator: "Amit Kumar / Aushutosh Ranjan",
        coordinator_phone: "7257929573 / 8863971241",
        faqques: [
            "Can pre-built academic capstone projects be exhibited?",
            "Will exhibition stalls and tables be provided?",
            "Who evaluates the projects?"
        ],
        faqans: [
            "Yes, existing original projects, innovations, or capstone prototypes developed by students are eligible.",
            "Each team is allotted a dedicated 2m x 1m demonstration table with 230V power points.",
            "Evaluated by senior faculty professors and invited industry engineering specialists."
        ]
    },
    {
        id: "hackathon",
        numId: "9",
        title: "36-Hour Hackathon",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "Sprint 36-hour software marathon solving real-world challenges with innovative software, UI/UX, and technical execution.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–3 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "09:00 AM",
        venue: "Computer Center, BCE Bhagalpur",
        coordinator: "Aniket / Himanshu Vishwas",
        coordinator_phone: "8802632032 / 9128571355",
        faqques: [
            "What problem tracks are featured?",
            "Are food and overnight workstations provided?",
            "What are the presentation requirements?"
        ],
        faqans: [
            "Themes span AI/ML solutions, Web3 & FinTech, Healthcare Automation, Smart Education, and Climate Systems.",
            "Yes, high-speed Wi-Fi, continuous power, snacks, midnight refreshments, and rest areas are arranged.",
            "Teams must push source code to GitHub and deliver a 5-minute live demo + 2-minute Q&A."
        ]
    },
    {
        id: "forensic",
        numId: "10",
        title: "Forensic Hackathon",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "Organized with CFET New Delhi & HHFC Patna. Investigate digital forensic clues, network intrusions, and cyber-crime files.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "2–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "11:00 AM",
        venue: "Cyber Forensics Lab, BCE Bhagalpur",
        coordinator: "Dev Raj Dev / Shailendra",
        coordinator_phone: "9631766064 / 7295084407",
        faqques: [
            "Who are the technical partners for this challenge?",
            "What skills and tools are tested?",
            "What format are the clues provided in?"
        ],
        faqans: [
            "Conducted under official technical guidance from Centre for Forensic Excellence & Tech (CFET) New Delhi & HHFC Patna.",
            "Network packet analysis (Wireshark), memory dumping (Volatility), disk imaging, file carving, steganography, and timeline reconstruction.",
            "Real-world anonymized disk raw images, PCAP captures, and encrypted forensic case dossiers."
        ]
    },
    {
        id: "competitive",
        numId: "11",
        title: "Competitive Programming",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "High-speed algorithmic contest by Debuggerzz Club. Solve DSA problems in C, C++, Java, or Python.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–3 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "02:00 PM",
        venue: "Computer Center Lab 1",
        coordinator: "Dev Raj Dev / Himanshu Vishwas",
        coordinator_phone: "9631766064 / 9128571355",
        faqques: [
            "What platform is used for code submission?",
            "What languages are supported?",
            "How does penalty time work?"
        ],
        faqans: [
            "Hosted on an automated judging platform with custom hidden test suites.",
            "C (gcc), C++ (g++ 20), Java (OpenJDK 17), and Python (Python 3.10+).",
            "ICPC scoring rules: Ranking by total problems solved, with tie-breaks decided by least accumulated submission penalty minutes."
        ]
    },
    {
        id: "blindcoding",
        numId: "12",
        title: "Blind Coding",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "Write complete syntactically correct code in C/C++ with the computer monitor powered off!",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1 Member",
        fee: "₹100 / person",
        event_date: "December 2026",
        event_time: "03:30 PM",
        venue: "Computer Center Lab 2",
        coordinator: "Anukul Anand / Ankit Srivastava",
        coordinator_phone: "7633072155 / 6200271610",
        faqques: [
            "Are monitors completely turned off during typing?",
            "What editor or IDE is used?",
            "How is evaluation done?"
        ],
        faqans: [
            "Monitors are physically switched off once the problem statement is read. Typing is conducted without visual feedback.",
            "Standard text editors (Notepad, nano, VS Code with screen blanking).",
            "Correctness of syntax, compilation on first attempt, runtime accuracy, and execution speed."
        ]
    },
    {
        id: "bughunting",
        numId: "13",
        title: "Bug Hunting",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "Spot vulnerabilities, logic flaws, and hidden exploits in live application targets under a 2-hour timer.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–2 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "04:00 PM",
        venue: "Software Engineering Lab",
        coordinator: "Aniket / Aakash Bhardwaj",
        coordinator_phone: "8802632032 / 9113490269",
        faqques: [
            "What types of targets are provided?",
            "What vulnerabilities count toward the score?",
            "Can automated scanners be used?"
        ],
        faqans: [
            "Custom-built web applications and API servers running inside sandboxed Docker containers.",
            "OWASP Top 10 exploits: SQL injection, XSS, CSRF, insecure direct object references, and privilege escalation.",
            "Manual auditing, browser developer tools, and intercepting proxies like Burp Suite Community are permitted."
        ]
    },
    {
        id: "memecircuit",
        numId: "14",
        title: "MeMe Circuit",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "Combine humor, meme culture, and tech savviness to create hilarious original tech/engineering memes on designated topics.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1 Member",
        fee: "₹100 / person",
        event_date: "December 2026",
        event_time: "01:00 PM",
        venue: "Multimedia Studio, BCE Bhagalpur",
        coordinator: "Rishu Kumar / Ayush Sharma",
        coordinator_phone: "9123456780 / 9876501234",
        faqques: [
            "What topics will be assigned?",
            "What tools can be used for designing?",
            "What is the judging rubric?"
        ],
        faqans: [
            "Engineering life, debugging nightmares, AI takeovers, semester backlogs, and hardware vs. software clashes.",
            "Photoshop, Canva, Figma, or any mobile image editing suite. Templates must be uniquely captioned.",
            "Originality (40%), humor/relatability (40%), and graphic presentation (20%)."
        ]
    },
    {
        id: "matlab",
        numId: "15",
        title: "MATLAB Simulation Challenge",
        category: "Coding & Cyber",
        category_id: "coding",
        imgsrc: "/rect55.png",
        desc: "Model and simulate dynamic engineering systems, signal processing pipelines, or power grid models in MATLAB & Simulink.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–3 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "02:30 PM",
        venue: "Simulation Center, BCE Bhagalpur",
        coordinator: "Priyanshu / Rohit Kumar",
        coordinator_phone: "7890123456 / 8901234567",
        faqques: [
            "What version of MATLAB is provided?",
            "Which toolboxes will be accessible?",
            "What deliverables are judged?"
        ],
        faqans: [
            "MATLAB R2022b / R2023a on licensed college lab workstations.",
            "Simulink, Simscape Electrical, Control System Toolbox, and Signal Processing Toolbox.",
            "Model stability, transient response curves, modular script design, and simulation runtime efficiency."
        ]
    },
    {
        id: "freefire",
        numId: "16",
        title: "Free-Fire Championship",
        category: "Esports & Gaming",
        category_id: "gaming",
        imgsrc: "/rect55.png",
        desc: "Battle royale and 4v4 Clash Squad esports showdown. Coordinate strategies, push ranks, and claim the Technoriti gaming trophy.",
        prize_pool: "₹6,000",
        first_prize: "Squad: ₹3,000",
        second_prize: "Squad: ₹2,000",
        third_prize: "BR MVP: ₹1,000",
        team_size: "4 Members",
        fee: "₹300 / team",
        event_date: "December 2026",
        event_time: "05:00 PM",
        venue: "Esports Arena (Online / LAN Stage)",
        coordinator: "Dev Raj Dev / Ratan Kumar",
        coordinator_phone: "9631766064 / 9142750917",
        faqques: [
            "Are emulators or triggers allowed?",
            "What maps will be played?",
            "How are points tallied?"
        ],
        faqans: [
            "Strictly mobile devices only (Android / iOS). Emulators, PC clients, and third-party macro triggers are strictly banned.",
            "Bermuda, Purgatory, and Kalahari across qualifying and grand finals lobbies.",
            "Standard esports scoring: Placement points plus 1 point per kill. Disconnection rules apply."
        ]
    },
    {
        id: "echess",
        numId: "17",
        title: "E-Chess Tournament",
        category: "Esports & Gaming",
        category_id: "gaming",
        imgsrc: "/rect55.png",
        desc: "Mind game battle of tactical masters conducted on international chess clocks. Rapid & Blitz knockout formats.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1 Member",
        fee: "₹100 / person",
        event_date: "December 2026",
        event_time: "10:00 AM",
        venue: "Library Reading Hall, BCE Bhagalpur",
        coordinator: "Sumit Kumar / Rahul Anand",
        coordinator_phone: "7856341290 / 9431876523",
        faqques: [
            "What time control is played?",
            "What platform or boards are used?",
            "Are FIDE rules followed?"
        ],
        faqans: [
            "10 minutes + 2 seconds increment for Rapid Swiss rounds; 3 minutes + 2 seconds for Blitz knockout finals.",
            "Official DGT digital clocks and standard tournament boards, or Chess.com enterprise LAN accounts.",
            "Standard FIDE fair-play rules and touch-move guidelines apply strictly."
        ]
    },
    {
        id: "bridgemaking",
        numId: "18",
        title: "Bridge Making Challenge",
        category: "Design & Civil",
        category_id: "design",
        imgsrc: "/rect55.png",
        desc: "Construct truss bridge models using specified wooden sticks & adhesive tested on point load deflection machines.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "10:30 AM",
        venue: "Civil Engineering Structural Lab",
        coordinator: "Aman Kumar / Vivek Sharma",
        coordinator_phone: "9334567812 / 8210987654",
        faqques: [
            "What dimensions and materials are permitted?",
            "What glue/adhesive can be used?",
            "How is the winning bridge determined?"
        ],
        faqans: [
            "Popsicle sticks (standard wooden sticks) up to 100 sticks total. Minimum clear span: 40 cm; width: 10 cm.",
            "Standard synthetic white adhesive (Fevicol MR). No epoxy resin, superglue, or mechanical fasteners allowed.",
            "Highest load-to-self-weight efficiency ratio: Maximum Failure Load (kg) / Bridge Weight (g)."
        ]
    },
    {
        id: "surveyking",
        numId: "19",
        title: "Survey King",
        category: "Design & Civil",
        category_id: "design",
        imgsrc: "/rect55.png",
        desc: "Field surveying challenge testing rapid leveling, transit theodolite triangulation, and contour mapping on campus grounds.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1 Member",
        fee: "₹50 / person",
        event_date: "December 2026",
        event_time: "01:00 PM",
        venue: "Main Campus Field, BCE Bhagalpur",
        coordinator: "Md. Danish / Saurabh Kumar",
        coordinator_phone: "8765432109 / 9876123450",
        faqques: [
            "What instruments are provided?",
            "What field tasks must be performed?",
            "How is accuracy judged?"
        ],
        faqans: [
            "Auto-levels, graduated leveling staves, tripods, optical plummets, and optical theodolites.",
            "Benchmark RL transfer, differential fly leveling loop closing, and horizontal angle measurement.",
            "Least closing error, speed of instrument setup, and neatness of recorded field book."
        ]
    },
    {
        id: "autocad",
        numId: "20",
        title: "AutoCAD Design Clash",
        category: "Design & Civil",
        category_id: "design",
        imgsrc: "/rect55.png",
        desc: "Fastest precision 2D drafting & 3D civil/mechanical modeling contest under time constraints with exact GD&T tolerances.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1 Member",
        fee: "₹100 / person",
        event_date: "December 2026",
        event_time: "11:30 AM",
        venue: "CAD/CAM Laboratory, BCE Bhagalpur",
        coordinator: "Vikash Singh / Ravi Ranjan",
        coordinator_phone: "7654321098 / 8901234578",
        faqques: [
            "What software versions will be used?",
            "What orthographic views are required?",
            "What are the scoring parameters?"
        ],
        faqans: [
            "Autodesk AutoCAD 2022 / 2023 on desktop workstations.",
            "Plan, elevation, sectional side view with dimensioning, layers, and title block.",
            "Dimensional accuracy (50%), layer management & line weights (30%), completion time (20%)."
        ]
    },
    {
        id: "solidworks",
        numId: "21",
        title: "SolidWorks 3D Challenge",
        category: "Design & Civil",
        category_id: "design",
        imgsrc: "/rect55.png",
        desc: "Model complex mechanical assemblies, parametric components, and render mechanical movements under competitive pressure.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–3 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "03:00 PM",
        venue: "Mechanical CAD Center",
        coordinator: "Nitish Kumar / Deepak Verma",
        coordinator_phone: "9123456789 / 7890564321",
        faqques: [
            "What design task is assigned?",
            "What constraints must be adhered to?",
            "How are assemblies judged?"
        ],
        faqans: [
            "Complex parametric machine component with internal gears, splines, or linkage mechanisms.",
            "Strict adherence to specified manufacturing tolerances, mass property evaluation, and draft angles.",
            "Fully defined sketches, accurate mass properties (evaluated against master model), and exploded view animation."
        ]
    },
    {
        id: "projectpresentation",
        numId: "22",
        title: "Project Presentation",
        category: "Design & Civil",
        category_id: "design",
        imgsrc: "/rect55.png",
        desc: "Present innovative research papers, prototype concepts, or engineering project synopses before our expert academic evaluation panel.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "02:00 PM",
        venue: "Auditorium Hall B, BCE Bhagalpur",
        coordinator: "Rajnish Kumar / Sneha Sinha",
        coordinator_phone: "8765432190 / 9431234567",
        faqques: [
            "What engineering domains are accepted?",
            "What is the presentation duration?",
            "What format should slides follow?"
        ],
        faqans: [
            "Mechanical, Civil, Electrical, Electronics, Computer Science, and Interdisciplinary engineering.",
            "8 minutes oral presentation followed by 2 minutes of questions from jury members.",
            "Standard 16:9 PPT/PDF presentation covering methodology, experimental results, and conclusion."
        ]
    },
    {
        id: "zerocarbon",
        numId: "23",
        title: "Zero Carbon Debate",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "Parliamentary debate on sustainability, green hydrogen, nuclear energy, carbon taxation, and environmental engineering policy.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–3 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "11:00 AM",
        venue: "Humanities Seminar Hall",
        coordinator: "Ananya Kumari / Aditya Prakash",
        coordinator_phone: "9123456711 / 8210987611",
        faqques: [
            "What debate format is followed?",
            "Can participants choose their stance?",
            "What is the judging criteria?"
        ],
        faqans: [
            "Modified Oxford/Parliamentary debate: 4 minutes constructive speech, 2 minutes rebuttal.",
            "Sides (Government vs. Opposition) are determined via coin toss 15 minutes before each round.",
            "Content depth & factual grounding (40%), clarity of delivery (30%), rebuttal sharpness (30%)."
        ]
    },
    {
        id: "cinematography",
        numId: "24",
        title: "Cinematography Contest",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "Create cinematic short films capturing campus life, technical innovation, or futuristic narrative themes in Full HD.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–4 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "04:00 PM",
        venue: "Auditorium Main Stage",
        coordinator: "Ritik Raj / Shubhashish",
        coordinator_phone: "9876543212 / 8765432123",
        faqques: [
            "What is the maximum film duration?",
            "What resolution and formats are accepted?",
            "Can archival footage or stock clips be used?"
        ],
        faqans: [
            "Between 3 and 7 minutes including opening titles and end credits.",
            "1080p Full HD (1920x1080) MP4 format with stereo audio.",
            "At least 80% of footage must be original footage filmed for the competition. Royalty-free audio permitted."
        ]
    },
    {
        id: "photography",
        numId: "25",
        title: "Photography Contest",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "Freeze decisive moments of techfest emotion, motion blur, and architectural aesthetics across BCE Bhagalpur campus.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "1–2 Members",
        fee: "₹50 / member",
        event_date: "December 2026",
        event_time: "02:00 PM",
        venue: "Open Air Gallery, BCE Bhagalpur",
        coordinator: "Abhinav Kumar / Tanya Singh",
        coordinator_phone: "7890123499 / 8901234599",
        faqques: [
            "What camera gear is permitted?",
            "Is post-processing allowed?",
            "How many photos can be submitted?"
        ],
        faqans: [
            "Both DSLR/Mirrorless cameras and mobile smartphones are eligible with separate category honors.",
            "Basic color grading, contrast, and crop adjustments are allowed. Generative AI compositing is prohibited.",
            "Maximum 3 photographs with untouched EXIF metadata."
        ]
    },
    {
        id: "electromania",
        numId: "26",
        title: "ElectroMania Quiz",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "Rapid-fire quiz testing electronic circuit trivia, semiconductor history, quantum computing breakthroughs, and technical concepts.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "2–4 Members",
        fee: "₹200 / team",
        event_date: "December 2026",
        event_time: "12:00 PM",
        venue: "ECE Department Hall",
        coordinator: "Siddharth Kumar / Rohit Jha",
        coordinator_phone: "9123456782 / 8210987652",
        faqques: [
            "What rounds are included?",
            "What topics are emphasized?",
            "Is there negative marking?"
        ],
        faqans: [
            "Preliminary written screening round, audio-visual buzzer round, and rapid-fire final stage.",
            "Semiconductors, microprocessor evolution, analog circuits, and communications tech.",
            "Buzzer rounds feature +10 points for correct answers and -5 points for incorrect buzzes."
        ]
    },
    {
        id: "nukkad",
        numId: "27",
        title: "Nukkad (Street Play)",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "Energetic street plays addressing technology ethics, cybersecurity awareness, social reform, or scientific education.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "6–15 Members",
        fee: "₹200 / team",
        event_date: "December 2026",
        event_time: "04:30 PM",
        venue: "Administrative Block Lawn",
        coordinator: "Prashant Kumar / Shreya Raj",
        coordinator_phone: "9431234568 / 8765432101",
        faqques: [
            "What is the performance time limit?",
            "What instruments or props can be used?",
            "What language can be spoken?"
        ],
        faqans: [
            "12 to 15 minutes max from call time to conclusion.",
            "Traditional acoustic percussion (dholak, dafli, cymbals) and portable acoustic props. No microphones/micro-amps allowed.",
            "Hindi or English (or blend of both)."
        ]
    },
    {
        id: "generalquiz",
        numId: "28",
        title: "General Quiz Challenge",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "Comprehensive trivia challenge covering world history, space discoveries, pop culture, geography, and technological milestones.",
        prize_pool: "₹3,000",
        first_prize: "₹2,000",
        second_prize: "₹1,000",
        third_prize: "Certificate of Excellence",
        team_size: "2–3 Members",
        fee: "₹100 / team",
        event_date: "December 2026",
        event_time: "01:30 PM",
        venue: "Central Library Hall",
        coordinator: "Alok Kumar / Neha Kumari",
        coordinator_phone: "9123456799 / 7890123411",
        faqques: [
            "How many preliminary questions are asked?",
            "How many teams qualify for the stage finals?",
            "Can participants use phones during the quiz?"
        ],
        faqans: [
            "25 written preliminary questions spanning multiple genres.",
            "Top 6 scoring teams qualify for the 5-round stage finals with the quizmaster.",
            "Strictly zero electronic devices permitted during both prelims and finals."
        ]
    },
    {
        id: "scitechquiz",
        numId: "29",
        title: "SciTech Grand Quiz",
        category: "Quizzes & Literary",
        category_id: "quizzes",
        imgsrc: "/rect55.png",
        desc: "The definitive flagship science and technology quiz testing deep engineering trivia, computing pioneers, and space missions.",
        prize_pool: "₹5,000",
        first_prize: "₹3,000",
        second_prize: "₹2,000",
        third_prize: "Certificate of Excellence",
        team_size: "2–3 Members",
        fee: "₹100 / team",
        event_date: "December 2026",
        event_time: "03:30 PM",
        venue: "Main Auditorium, BCE Bhagalpur",
        coordinator: "Adarsh Raj / Swati Priya",
        coordinator_phone: "8210987644 / 9431234590",
        faqques: [
            "What level of science/tech knowledge is expected?",
            "What special rounds are conducted?",
            "Who is eligible to participate?"
        ],
        faqans: [
            "Covers quantum physics, computing legends, Nobel laureates, space exploration, and seminal engineering breakthroughs.",
            "Connect round, visual grid round, dry pounce, and bounce buzzer round.",
            "Open to all enrolled university and college students with valid student ID."
        ]
    }
];

// Curated high-resolution competition imagery matching Technoriti '26 source DOM
export const competitionImages = {
    robowar: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
    robosoccer: "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&w=800&q=80",
    dhanush: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    matsya: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    electrotechnovation: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
    arduino: "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80",
    boatmaking: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80",
    electronicsproject: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
    hackathon: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    forensic: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
    competitive: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80",
    blindcoding: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    bughunting: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    memecircuit: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80",
    matlab: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    freefire: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
    echess: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80",
    bridgemaking: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=800&q=80",
    surveyking: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    autocad: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    solidworks: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    presentation: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    zerocarbon: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&q=80",
    cinematography: "https://images.unsplash.com/photo-1579632652768-6cb9dcf85912?auto=format&fit=crop&w=800&q=80",
    photography: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    electromania: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    nukkad: "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=800&q=80",
    quiz: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80",
    scitechquiz: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80"
};

// Build eventmap lookup table mapping both numeric IDs and slug keys
const eventmap = {};

competitionsList.forEach((c) => {
    c.cover_img = competitionImages[c.id] || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";
    eventmap[c.numId] = c;
    eventmap[c.id] = c;
});

/** Formats competition list for CurvedLensCarousel */
export const getLensSlides = (list = competitionsList) => {
    return list.map((c) => ({
        title: c.title,
        kicker: c.category.toUpperCase(),
        caption: `${c.prize_pool || "₹5,000"} Prize Pool • ${c.venue || "BCE Bhagalpur"}`,
        image: c.cover_img || competitionImages[c.id] || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        alt: c.title,
        id: c.id
    }));
};

/** Formats competition list for HaloReel */
export const getHaloReelItems = (list = competitionsList) => {
    return list.map((c) => ({
        src: c.cover_img || competitionImages[c.id],
        title: c.title,
        subtitle: c.category,
        alt: c.title,
        bgColor: "#170f22",
        textColor: "#ffffff",
        id: c.id
    }));
};

/** Formats competition list for CinematicList */
export const getCinematicItems = (list = competitionsList) => {
    return list.map((c, idx) => ({
        id: String(idx + 1).padStart(2, "0"),
        title: c.title,
        location: c.category,
        src: c.cover_img || competitionImages[c.id] || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        alt: `${c.title} — ${c.category} Competition`,
        prize: `${c.prize_pool || "₹5,000"} Prize Pool`,
        venue: c.venue || "BCE Bhagalpur",
        teamSize: c.team_size || "1–4 Members",
        rawId: c.id
    }));
};

export default eventmap;
