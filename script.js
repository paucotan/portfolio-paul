// Smooth scrolling and enhanced UX interactions
document.addEventListener('DOMContentLoaded', function() {

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Header scroll effect
    const header = document.querySelector('.header');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 100) {
            header.style.background = 'rgba(10, 10, 15, 0.98)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.background = 'rgba(10, 10, 15, 0.95)';
            header.style.boxShadow = 'none';
        }

        // Hide/show header on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }

        lastScrollY = currentScrollY;
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';

                // Stagger animation for project cards
                if (entry.target.classList.contains('project-card')) {
                    const cards = document.querySelectorAll('.project-card');
                    const index = Array.from(cards).indexOf(entry.target);
                    entry.target.style.transitionDelay = `${index * 0.1}s`;
                }

                // Stagger animation for skill items
                if (entry.target.classList.contains('skill-item')) {
                    const skills = document.querySelectorAll('.skill-item');
                    const index = Array.from(skills).indexOf(entry.target);
                    entry.target.style.transitionDelay = `${index * 0.1}s`;
                }
            }
        });
    }, observerOptions);

    // Observe elements for scroll animations
    document.querySelectorAll('.project-card, .skill-item, .contact-link').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Approach highlight animation on scroll
    const approachHighlight = document.querySelector('.approach-highlight');
    if (approachHighlight) {
        const approachObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('highlighted');
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        });
        
        approachObserver.observe(approachHighlight);
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';

            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            navLinks.classList.toggle('mobile-menu-open');

            // Animate hamburger lines
            const lines = mobileMenuToggle.querySelectorAll('.hamburger-line');
            lines.forEach((line, index) => {
                if (!isExpanded) {
                    if (index === 0) line.style.transform = 'rotate(45deg) translate(6px, 6px)';
                    if (index === 1) line.style.opacity = '0';
                    if (index === 2) line.style.transform = 'rotate(-45deg) translate(6px, -6px)';
                } else {
                    line.style.transform = 'none';
                    line.style.opacity = '1';
                }
            });
        });
    }

    // Parallax effect for background layers
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const starsLayer = document.querySelector('.stars-layer');
        const cloudsLayer = document.querySelector('.clouds-layer');

        if (starsLayer) {
            starsLayer.style.transform = `translateY(${scrolled * 0.2}px)`;
        }

        if (cloudsLayer) {
            cloudsLayer.style.transform = `translateY(${scrolled * 0.1}px) translateX(-5%)`;
        }
    });

    // Enhanced button interactions
    document.querySelectorAll('.cta-button, .project-link').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });

        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });

        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(-1px) scale(0.98)';
        });

        button.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
    });

    // Subtle project card hover effect
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Typing animation for hero title
    const heroName = document.querySelector('.hero-name');
    if (heroName) {
        const text = heroName.textContent;
        heroName.textContent = '';
        let i = 0;

        const typeWriter = () => {
            if (i < text.length) {
                heroName.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };

        setTimeout(typeWriter, 1000);
    }

    // Skills hover effect with ripple
    document.querySelectorAll('.skill-item').forEach(skill => {
        skill.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(99, 102, 241, 0.3)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.pointerEvents = 'none';

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Contact links enhanced interaction
    document.querySelectorAll('.contact-link').forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
            this.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.3)';
        });

        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = 'none';
        });
    });

    // Scroll progress indicator
    const createScrollProgress = () => {
        const progressBar = document.createElement('div');
        progressBar.style.position = 'fixed';
        progressBar.style.top = '0';
        progressBar.style.left = '0';
        progressBar.style.width = '0%';
        progressBar.style.height = '3px';
        progressBar.style.background = 'linear-gradient(90deg, #6366f1, #818cf8)';
        progressBar.style.zIndex = '9999';
        progressBar.style.transition = 'width 0.1s ease-out';
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            progressBar.style.width = scrollPercent + '%';
        });
    };

    createScrollProgress();

    // Project Carousel Functionality
    initializeCarousels();

    // Image Modal Functionality
    initializeImageModal();
});

// Carousel initialization and functionality
function initializeCarousels() {
    const carousels = document.querySelectorAll('.project-carousel');

    carousels.forEach((carousel, carouselIndex) => {
        const slides = carousel.querySelectorAll('.carousel-slide');
        const dots = carousel.querySelectorAll('.carousel-dot');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');

        let currentSlide = 0;
        let autoPlayInterval;

        // Show specific slide
        function showSlide(index) {
            // Hide all slides
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));

            // Show current slide
            if (slides[index]) {
                slides[index].classList.add('active');
                dots[index].classList.add('active');
                currentSlide = index;
            }
        }

        // Next slide
        function nextSlide() {
            const nextIndex = (currentSlide + 1) % slides.length;
            showSlide(nextIndex);
        }

        // Previous slide
        function prevSlide() {
            const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(prevIndex);
        }

        // Auto-play functionality
        function startAutoPlay() {
            autoPlayInterval = setInterval(nextSlide, 6000); // Change slide every 4 seconds
        }

        function stopAutoPlay() {
            clearInterval(autoPlayInterval);
        }

        // Event listeners
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                nextSlide();
                stopAutoPlay();
                setTimeout(startAutoPlay, 8000); // Restart auto-play after 8 seconds
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                prevSlide();
                stopAutoPlay();
                setTimeout(startAutoPlay, 8000); // Restart auto-play after 8 seconds
            });
        }

        // Dot navigation
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                showSlide(index);
                stopAutoPlay();
                setTimeout(startAutoPlay, 8000); // Restart auto-play after 8 seconds
            });
        });

        // Pause auto-play on hover
        carousel.addEventListener('mouseenter', stopAutoPlay);
        carousel.addEventListener('mouseleave', startAutoPlay);

        // Touch/swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    nextSlide(); // Swipe left - next slide
                } else {
                    prevSlide(); // Swipe right - previous slide
                }
                stopAutoPlay();
                setTimeout(startAutoPlay, 8000);
            }
        }

        // Keyboard navigation
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
                stopAutoPlay();
                setTimeout(startAutoPlay, 8000);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextSlide();
                stopAutoPlay();
                setTimeout(startAutoPlay, 8000);
            }
        });

        // Initialize carousel
        showSlide(0);

        // Start auto-play only if there are multiple slides
        if (slides.length > 1) {
            startAutoPlay();
        }

        // Pause auto-play when page is not visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoPlay();
            } else if (slides.length > 1) {
                startAutoPlay();
            }
        });
    });
}

// Image Modal functionality
function initializeImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalCounter = document.getElementById('modalCounter');
    const modalClose = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalPrev = document.querySelector('.modal-prev');
    const modalNext = document.querySelector('.modal-next');

    let currentImages = [];
    let currentIndex = 0;
    let currentProjectInfo = {};

    // Function to update modal display
    function updateModal() {
        if (currentImages.length === 0) return;

        const currentImg = currentImages[currentIndex];
        modalImage.src = currentImg.src;
        modalImage.alt = currentImg.alt;
        modalTitle.textContent = currentProjectInfo.title;
        modalDescription.textContent = currentProjectInfo.description;
        modalCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;

        // Always enable navigation buttons for looping
        modalPrev.disabled = false;
        modalNext.disabled = false;

        // Hide navigation if only one image
        if (currentImages.length === 1) {
            modalPrev.style.display = 'none';
            modalNext.style.display = 'none';
        } else {
            modalPrev.style.display = 'flex';
            modalNext.style.display = 'flex';
        }
    }

    // Function to open modal
    function openModal(clickedImg, projectInfo) {
        // Get all images from the same project
        const projectCard = clickedImg.closest('.project-card');
        const allImages = projectCard.querySelectorAll('.carousel-slide img');
        
        currentImages = Array.from(allImages);
        currentIndex = currentImages.indexOf(clickedImg);
        currentProjectInfo = projectInfo;

        updateModal();
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    // Function to close modal
    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // Clear data after animation
        setTimeout(() => {
            modalImage.src = '';
            currentImages = [];
            currentIndex = 0;
            currentProjectInfo = {};
        }, 300);
    }

    // Navigation functions
    function showPreviousImage() {
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            // Loop to last image
            currentIndex = currentImages.length - 1;
        }
        updateModal();
    }

    function showNextImage() {
        if (currentIndex < currentImages.length - 1) {
            currentIndex++;
        } else {
            // Loop to first image
            currentIndex = 0;
        }
        updateModal();
    }

    // Add click listeners to all carousel images
    document.querySelectorAll('.carousel-slide img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Get project info from the closest project card
            const projectCard = img.closest('.project-card');
            const projectTitle = projectCard.querySelector('.project-title').textContent;
            const projectDescription = projectCard.querySelector('.project-description').textContent;
            
            openModal(img, {
                title: projectTitle,
                description: projectDescription
            });
        });
    });

    // Navigation event listeners
    modalPrev.addEventListener('click', showPreviousImage);
    modalNext.addEventListener('click', showNextImage);

    // Close modal on close button click
    modalClose.addEventListener('click', closeModal);

    // Close modal on overlay click
    modalOverlay.addEventListener('click', closeModal);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('active')) {
            switch(e.key) {
                case 'Escape':
                    closeModal();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    showPreviousImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    showNextImage();
                    break;
            }
        }
    });

    // Prevent modal content clicks from closing modal
    document.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// CSS for additional animations
const additionalStyles = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .mobile-menu-open {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: rgba(10, 10, 15, 0.98);
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(99, 102, 241, 0.2);
        padding: 1rem 0;
        animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (max-width: 768px) {
        .nav-links {
            display: none;
        }

        .mobile-menu-open .nav-link {
            padding: 1rem 2rem;
            border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .mobile-menu-open .nav-link:last-child {
            border-bottom: none;
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
