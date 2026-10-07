
const menuBody = document.getElementsByTagName('body')[0];
const menuNav =  document.getElementsByClassName('js-nav')[0];
const menuOverlay = document.getElementsByClassName('js-nav-overlay')[0];

let windowScrollY = '0px';

const SiteNav = () => {
  window.addEventListener('scroll', () => {
    windowScrollY = window.scrollY + 'px';
  });

  document.querySelectorAll('.js-nav-toggle').forEach(el => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      _toggleNav();
    });
  });

  menuOverlay.addEventListener('click', (event) => {
    event.preventDefault();
    _toggleNav();
  });

  document.querySelectorAll('.js-submenu').forEach(el => {
    el.addEventListener('mouseenter', (event) => {
      if (window.getComputedStyle(menuOverlay).display == 'none') {
        _showNavDropDown(event.target);
      }
    }, false);

    el.addEventListener('mouseleave', (event) => {
      if (window.getComputedStyle(menuOverlay).display == 'none') {
        _hideNavDropDown(event.target);
      }
    }, false);
  });

  document.querySelectorAll('.js-submenu > a').forEach(el => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      if (window.getComputedStyle(menuOverlay).display == 'block') {
        _toogleNavDropDown(event.target.parentNode);
      }
    });
  });

  menuNav.addEventListener('transitionend', () => {
    menuBody.classList.remove('is-nav-transition');
  });
};

// open drawer on mobile
const _toggleNav = () => {
  menuBody.classList.add('is-nav-transition');

  if (menuBody.classList.contains('is-nav-open')) {
    menuBody.classList.remove('is-nav-open');
    _addNavBodyScroll();
  }
  else {
    menuBody.classList.add('is-nav-open');
    _removeNavBodyScroll();
  }
};

const _toogleNavDropDown = (element) => {
  if (element.classList.contains('is-open')) {
    _hideNavDropDown(element);
  }
  else {
    _showNavDropDown(element);
  }
};

// show submenu
const _showNavDropDown = (element) => {
  element.classList.add('is-open');
};

// hide all submenus
const _hideNavDropDown = (element) => {
  element.classList.remove('is-open');
  element.querySelectorAll('.js-submenu').forEach(el => {
    el.classList.remove('is-open');
  });
};

// remove scrollbar for body element
const _removeNavBodyScroll = () => {
  const scrollY = windowScrollY;

  document.documentElement.style.scrollBehavior = 'auto';

  menuBody.style.position = 'fixed';
  menuBody.style.top = `-${scrollY}`;
};

// add body scrollbar back and position viewport
const _addNavBodyScroll = () => {
  const scrollY = menuBody.style.top;

  menuBody.style.position = '';
  menuBody.style.top = '';

  window.scrollTo(0, parseInt(scrollY || '0') * -1);
  document.documentElement.style.scrollBehavior = 'smooth';
};


SiteNav();
