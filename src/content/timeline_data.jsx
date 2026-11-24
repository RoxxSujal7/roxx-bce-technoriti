class Event_data {
    constructor(time, content, byWhom) {
      this.time = time;
      this.content = content;
      this.byWhom = byWhom;
    }
}

const timeLineLst = {
    "day1": {
        '09:00': new Event_data(
            '09:00 - 10:00',
            'Inauguration & Welcome Address',
            'By Dr. Bimlesh Kumar - Principal, BCE Bhagalpur'
        ),
        '10:30': new Event_data(
            '10:30 - 13:00',
            'Flagship Robotics & Hackathon Kickoff',
            'RoboWar Arena & Computer Center'
        ),
        '14:00': new Event_data(
            '14:00 - 17:00',
            'Technical Exhibitions & Paper Presentations',
            'Central Seminar Hall & ECE Department'
        )
    }
};

export { Event_data, timeLineLst };
