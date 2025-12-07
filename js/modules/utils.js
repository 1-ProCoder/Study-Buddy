const Utils = {
    quotes: [
        "The only way to do great work is to love what you do. – Steve Jobs",
        "Success is not the key to happiness. Happiness is the key to success. – Albert Schweitzer",
        "Believe you can and you're halfway there. – Theodore Roosevelt",
        "It always seems impossible until it's done. – Nelson Mandela",
        "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
        "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
        "Start where you are. Use what you have. Do what you can. – Arthur Ashe",
        "Success is the sum of small efforts, repeated day in and day out. – Robert Collier"
    ],

    getRandomQuote() {
        return this.quotes[Math.floor(Math.random() * this.quotes.length)];
    },

    getCalendarData(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay(); // 0 = Sunday

        return {
            year,
            month,
            monthName: firstDay.toLocaleString('default', { month: 'long' }),
            daysInMonth,
            startDay
        };
    },

    triggerConfetti() {
        const canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = 150;
        const gravity = 0.5;
        const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15 - 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                life: 100
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let active = false;

            particles.forEach(p => {
                if (p.life > 0) {
                    active = true;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += gravity;
                    p.life--;
                    p.size *= 0.96;

                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            if (active) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }

        animate();
    }
};
