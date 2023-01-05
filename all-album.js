// settings
const swipingThreshold = 5;
const transitionDuration = 400;
const slideChangeThreshold = 150;

// lightbox variables
let lightbox;
let lightboxWrapper;
let images = [];
let currentIndex = 0;
let wasSwiping = false;

// slides variables
let currentSlide;
let prevSlide;
let nextSlide;
let distance = 0;
let startPos = 0;
let slideWidth = 0;

// feature detection
const isSrcsetSupported = 'srcset' in new Image();

if (document.readyState !== 'loading') {
    initGallery();
} else {
    document.addEventListener('DOMContentLoaded', initGallery);
}

function initGallery() {
    createGallery();
    createLightbox();
}

// uses progressive image loading
function createGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const galleryThumbs = document.querySelectorAll('.gallery-item .thumb');

    const loadThumbnail = target => {

        // get the src and srcset from the dataset of the gallery thumb
        const src = target.dataset.src;
        const srcset = target.dataset.srcset;

        // create a temporary image
        const tempImage = new Image();

        // set the src or srcset of the temp img to preload the actual image file
        if (isSrcsetSupported && srcset) {
            tempImage.srcset = srcset;
        } else if (src) {
            tempImage.src = src;
        }

        // when the temp image is loaded, set the src or srcset to the gallery thumb
        tempImage.onload = function () {
            if (tempImage.srcset) {
                target.srcset = srcset;
            } else if (src) {
                target.src = src;
            }

            target.classList.remove('placeholder');
        }
    };

    if ('IntersectionObserver' in window) {
        const observerOptions = {
            rootMargin: '200px 0px'
        }

        const handleIntersectionObserver = entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadThumbnail(entry.target);
                    intersectionObserver.unobserve(entry.target);
                }
            });
        };

        const intersectionObserver = new IntersectionObserver(handleIntersectionObserver, observerOptions);

        galleryThumbs.forEach(el => intersectionObserver.observe(el));

    } else {
        // Fallback for unsupported browsers
        galleryThumbs.forEach(el => loadThumbnail(el));
    }

    galleryItems.forEach(item => item.addEventListener('click', e => {
        const currentTarget = e.currentTarget;

        const currentGallery = currentTarget.closest('.gallery');
        const itemIndex = Array.from(galleryItems).indexOf(e.currentTarget);

        openLightbox(currentGallery, itemIndex);
        initSlides();
    }));
}

function openLightbox(currentGallery, targetIndex) {
    fadeIn(lightbox.parentNode);

    images = [];
    currentGallery.querySelectorAll('.gallery-item').forEach(element => {
        const currentImageEl = element.querySelector('img');

        const currentItem = {
            src: currentImageEl.dataset.image || currentImageEl.dataset.src,
            srcFallback: currentImageEl.dataset.imageFallback,
            srcset: currentImageEl.dataset.imageSrcset,
            title: currentImageEl.dataset.title
        }

        images.push(currentItem);
    });

    currentIndex = targetIndex;
    showInitialImage(targetIndex);
    updateLightboxHeader(targetIndex);
}

function showInitialImage(index) {
    const prevSlide = lightbox.querySelector('.lightbox-slide[data-state="prev"]');
    const currentSlide = lightbox.querySelector('.lightbox-slide[data-state="current"]');
    const nextSlide = lightbox.querySelector('.lightbox-slide[data-state="next"]');
    const currentImage = currentSlide.querySelector('.lightbox-image');

    loadImage(currentSlide, index);

    const imageLoadHandler = e => {
        loadImage(prevSlide, index - 1);
        loadImage(nextSlide, index + 1);
        currentImage.removeEventListener('load', imageLoadHandler);
    }

    currentImage.addEventListener('load', imageLoadHandler);
}

// ------------------------------ //
// Create Lightbox DOM Elements,
// Append Lightbox to Body
// ------------------------------ //
function createLightbox() {
    // lightbox & wrapper
    lightboxWrapper = createElement('div', 'lightbox-wrapper');
    lightbox = createElement('div', 'lightbox');

    // Header
    const lightboxHeader = createElement('div', 'lightbox-header');
    const lightboxNumbers = createElement('div', 'lightbox-numbers');
    const lightboxTitle = createElement('div', 'lightbox-title');
    const lightboxClose = createElement('button', 'lightbox-close', { type: 'button', 'aria-label': 'Close' });
    lightboxHeader.append(lightboxNumbers, lightboxTitle, lightboxClose);
    lightbox.append(lightboxHeader);

    // Slides Wrapper
    const slidesWrapper = createElement('div', 'lightbox-slides-wrapper');
    lightbox.append(slidesWrapper);

    // Slides
    const prevSlide = createElement('div', 'lightbox-slide', { 'data-state': 'prev' });
    const currentSlide = createElement('div', 'lightbox-slide', { 'data-state': 'current' });
    const nextSlide = createElement('div', 'lightbox-slide', { 'data-state': 'next' });
    slidesWrapper.append(prevSlide, currentSlide, nextSlide);

    // Image
    const lightboxImage = createElement('img', 'lightbox-image', { draggable: false });
    currentSlide.append(lightboxImage);
    prevSlide.append(lightboxImage.cloneNode());
    nextSlide.append(lightboxImage.cloneNode());

    // Loading Spinner
    const spinner = '<div class="spinner spinner-border" role="status"><span class="sr-only">Loading...</span></div>';
    currentSlide.insertAdjacentHTML('beforeend', spinner);
    prevSlide.insertAdjacentHTML('beforeend', spinner);
    nextSlide.insertAdjacentHTML('beforeend', spinner);

    // Arrows
    lightbox.insertAdjacentHTML('beforeend', '<div class="lightbox-arrow arrow-left"></div>');
    lightbox.insertAdjacentHTML('beforeend', '<div class="lightbox-arrow arrow-right"></div>');

    // Footer
    const lightboxFooter = createElement('div', 'lightbox-footer');
    lightbox.append(lightboxFooter);

    // append lightbox to body
    lightboxWrapper.append(lightbox);
    document.body.append(lightboxWrapper);
}

function addLightboxEventListeners() {
    // close lightbox when clicking on background
    lightbox.querySelectorAll('.lightbox-slide').forEach(slide => {
        slide.addEventListener('click', handleSlideClick);
    });

    // close lightbox when clicking on close button
    const closeBtn = lightbox.querySelector('.lightbox-close');
    closeBtn.addEventListener('click', closeLightbox);
}

function closeLightbox() {
    const lightboxImages = lightbox.querySelectorAll('.lightbox-image');

    // fade out
    fadeOut(lightboxWrapper)
        .then(() => {
            lightboxImages.forEach(image => image.src = '');
            lightboxImages.forEach(image => image.srcset = '');
        });

    // remove 'keydown' event handler from document element
    document.documentElement.removeEventListener('keydown', handleLightboxKeyDown);
}

// slide 'click' event handler
function handleSlideClick(event) {
    if (event.currentTarget == event.target && !wasSwiping) closeLightbox();
}

// slide 'mousemove' and 'touchmove' event handler
function handleSlideMove(event) {
    const currentPos = event.type == 'touchmove' ? event.touches[0].clientX : event.clientX;
    distance = currentPos - startPos;

    if (distance < -swipingThreshold || distance > swipingThreshold) wasSwiping = true;

    // move current slide and adjust opacity
    currentSlide.style.transform = `translateX(${distance}px)`;
    currentSlide.style.opacity = mapRange(Math.abs(distance), 0, slideWidth, 1, 0);

    // TODO: reset slide if (currentPos > slideWidth || currentPos < 0)   (not sure if necessary)

    if (distance < 0) {
        // move next slide and adjust opacity
        nextSlide.style.transform = `translateX(${slideWidth + distance}px)`;
        nextSlide.style.opacity = mapRange(Math.abs(distance), 0, slideWidth, 0, 1);
    } else {
        // move previous slide and adjust opacity
        prevSlide.style.transform = `translateX(${distance - slideWidth}px)`;
        prevSlide.style.opacity = mapRange(Math.abs(distance), 0, slideWidth, 0, 1);
    }
}

// slide 'mousedown' and 'touchstart' event handler
function handleMouseDownOrTouchStart(event) {
    startPos = event.type == 'touchstart' ? event.touches[0].clientX : event.clientX;
    slideWidth = currentSlide.offsetWidth;
    wasSwiping = false;

    currentSlide.style.transitionDuration = '0ms';
    currentSlide.addEventListener('mousemove', handleSlideMove);
    currentSlide.addEventListener('touchmove', handleSlideMove);
}

// slide 'mouseup' and 'touchend' event handler
function handleMouseUpOrTouchEnd(event) {
    if (distance < -slideChangeThreshold) {
        showNextSlide();
        updateLightbox('next');
    } else if (distance > slideChangeThreshold) {
        showPrevSlide();
        updateLightbox('prev');
    } else {
        resetSlide();
        updateLightbox('current');
    }
}

// lightbox 'keydown' event handler
function handleLightboxKeyDown(event) {
    if (event.key == 'ArrowLeft') {
        showPrevSlide();
        updateLightbox('prev');
    } else if (event.key == 'ArrowRight') {
        showNextSlide();
        updateLightbox('next');
    } else if (event.key == 'Escape') {
        closeLightbox();
    }
}

// left arrow 'click' event handler
function handleClickLeftArrow(event) {
    showPrevSlide();
    updateLightbox('prev');
}

// right arrow 'click' event handler
function handleClickRightArrow(event) {
    showNextSlide();
    updateLightbox('next');
}

function transformSlide(slide, translateX, opacity) {
    slide.style.transform = `translateX(${translateX})`;
    slide.style.opacity = opacity;
    slide.style.transitionDuration = `${transitionDuration}ms`;
    slide.removeEventListener('mousemove', handleSlideMove);
    slide.removeEventListener('touchmove', handleSlideMove);
    distance = 0;
}

function showNextSlide() {
    transformSlide(prevSlide, '100%', 0);
    transformSlide(currentSlide, '-100%', 0);
    transformSlide(nextSlide, '0px', 1);
}

function showPrevSlide() {
    transformSlide(prevSlide, '0px', 1);
    transformSlide(currentSlide, '100%', 0);
    transformSlide(nextSlide, '-100%', 0);
}

function resetSlide() {
    transformSlide(prevSlide, '-100%', 0);
    transformSlide(currentSlide, '0px', 1);
    transformSlide(nextSlide, '100%', 0);
}

function updateLightbox(newSlide) {
    if (newSlide != 'current') removeSlideEventListeners();

    setTimeout(() => {
        // reset transition duration
        [currentSlide, nextSlide, prevSlide].forEach(element => {
            element.style.transitionDuration = '0ms';
        });

        let index;

        if (newSlide == 'next') {
            prevSlide.dataset.state = 'next';
            nextSlide.dataset.state = 'current';
            currentSlide.dataset.state = 'prev';

            index = getLoopedIndex(currentIndex + 1);
            loadImage(prevSlide, index + 1);

        } else if (newSlide == 'prev') {
            prevSlide.dataset.state = 'current';
            currentSlide.dataset.state = 'next';
            nextSlide.dataset.state = 'prev';

            index = getLoopedIndex(currentIndex - 1);
            loadImage(nextSlide, index - 1);

        } else {
            return;
        }

        updateSlideVariables();
        addSlideEventListeners();
        updateLightboxHeader(index);

        currentIndex = index;

    }, transitionDuration);
}

function removeSlideEventListeners() {
    // keyboard event listener
    document.documentElement.removeEventListener('keydown', handleLightboxKeyDown);

    // arrow buttons event listener
    lightbox.querySelector('.lightbox-arrow.arrow-left').removeEventListener('click', handleClickLeftArrow);
    lightbox.querySelector('.lightbox-arrow.arrow-right').removeEventListener('click', handleClickRightArrow);
}

function updateSlideVariables() {
    currentSlide = document.querySelector('.lightbox-slide[data-state="current"]');
    prevSlide = document.querySelector('.lightbox-slide[data-state="prev"]');
    nextSlide = document.querySelector('.lightbox-slide[data-state="next"]');
}

function addSlideEventListeners() {
    // mouse & touch event listener
    currentSlide.addEventListener('mousedown', handleMouseDownOrTouchStart);
    currentSlide.addEventListener('touchstart', handleMouseDownOrTouchStart);
    currentSlide.addEventListener('mouseup', handleMouseUpOrTouchEnd);
    currentSlide.addEventListener('touchend', handleMouseUpOrTouchEnd);
    currentSlide.addEventListener('touchcancel', handleMouseUpOrTouchEnd);

    // keyboard event listener
    document.documentElement.addEventListener('keydown', handleLightboxKeyDown);

    // click on arrow
    lightbox.querySelector('.lightbox-arrow.arrow-left').addEventListener('click', handleClickLeftArrow);
    lightbox.querySelector('.lightbox-arrow.arrow-right').addEventListener('click', handleClickRightArrow);
}

function initSlides() {
    updateSlideVariables();
    addSlideEventListeners();
    addLightboxEventListeners();
}

function updateLightboxHeader(index) {
    index = getLoopedIndex(index);
    const title = images[index].title;

    lightbox.querySelector('.lightbox-title').textContent = title;
    lightbox.querySelector('.lightbox-numbers').textContent = index + 1 + '/' + images.length;
}

function loadImage(targetSlide, index) {
    index = getLoopedIndex(index);

    const currentImage = targetSlide.querySelector('.lightbox-image');
    const spinner = targetSlide.querySelector('.spinner');
    const src = isSrcsetSupported ? images[index].src : images[index].srcFallback;
    const srcset = images[index].srcset;
    const tempImage = new Image();

    currentImage.setAttribute('src', '');
    currentImage.setAttribute('srcset', '');
    hide(currentImage);
    show(spinner);

    if (isSrcsetSupported && srcset) {
        tempImage.srcset = srcset;
    } else {
        tempImage.src = src;
    }

    const loadImageHandler = e => {
        if (isSrcsetSupported && srcset) {
            currentImage.setAttribute('srcset', srcset);
        } else {
            currentImage.setAttribute('src', src);
        }

        hide(spinner);
        show(currentImage);
        currentImage.removeEventListener('load', loadImageHandler);
    }

    tempImage.addEventListener('load', loadImageHandler);
}

function getLoopedIndex(index) {
    if (index > images.length - 1) return 0;
    if (index < 0) return images.length - 1;
    return index;
}

// ------------------------------ //
// Utility Functions
// ------------------------------ //

function fadeIn(element, display = 'block', ms = 200) {
    return new Promise(resolve => {
        element.style.display = display;
        element.style.opacity = 0;

        let opacity = 0;
        const timer = setInterval(() => {
            opacity += 50 / ms;
            if (opacity >= 1) {
                clearInterval(timer);
                opacity = 1;
                resolve();
            }
            element.style.opacity = opacity;
        }, 50);
    });
}

function fadeOut(element, ms = 200) {
    return new Promise(resolve => {
        let opacity = 1;
        const timer = setInterval(() => {
            opacity -= 50 / ms;
            if (opacity <= 0) {
                clearInterval(timer);
                element.style.opacity = 0;
                element.style.display = 'none';
                resolve();
            } else {
                element.style.opacity = opacity;
            }
        }, 50);
    });
}

function show(element, display = 'block') {
    element.style.display = display;
}

function hide(element) {
    element.style.display = 'none';
}

function createElement(type, className, attributesObj) {
    const element = document.createElement(type);
    if (Array.isArray(className)) {
        for (const name of className) element.classList.add(name);
    } else if (className) {
        element.classList.add(className);
    }
    for (const attrName in attributesObj) element.setAttribute(attrName, attributesObj[attrName]);
    return element;
}

// Re-maps a number from one range to another.
function mapRange(value, fromIn, toIn, fromOut, toOut) {
    return fromOut + (toOut - fromOut) * (value - fromIn) / (toIn - fromIn);
}