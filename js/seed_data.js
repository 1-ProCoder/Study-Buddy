// Seed Data Script
const seedData = () => {
    const subjects = [
        {
            id: '1',
            name: 'Mathematics',
            color: '#4f46e5',
            topics: [
                { id: 't1', name: 'Algebra', completed: true, difficulty: 'Medium', estimatedTime: 45 },
                { id: 't2', name: 'Calculus', completed: false, difficulty: 'Hard', estimatedTime: 60 }
            ]
        },
        {
            id: '2',
            name: 'Physics',
            color: '#0ea5e9',
            topics: [
                { id: 't3', name: 'Mechanics', completed: false, difficulty: 'Hard', estimatedTime: 90 }
            ]
        }
    ];

    const countdowns = [
        {
            id: 'c1',
            title: 'Final Exam',
            type: 'exam',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        },
        {
            id: 'c2',
            title: 'Project Due',
            type: 'event',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
        }
    ];

    localStorage.setItem('sb_subjects', JSON.stringify(subjects));
    localStorage.setItem('sb_countdowns', JSON.stringify(countdowns));

    // Force reload to pick up changes
    location.reload();
};

seedData();
