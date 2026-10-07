
const header = document.getElementsByClassName('js-fixed')[0];
const headerBottom = header.offsetTop + header.offsetHeight; // bottom point of the header
const delta = 24; // scroll tolerance (~ 1rem)

var prevScrollTop = 0; // to indicate scroll direction

$(function() {
  $(window).scroll(function () {
    topFixHeader();
  });

  $('body').delegate('.js-fixed', 'transitionend', function () {
    var $header = $('.js-fixed').first();
    if ($header.hasClass('is-transition')) {
      $header.removeClass('is-transition');
    }
  });
});

function topFixHeader () {
  var $body = $('body').first(),
      $button = $('.js-button-up').first(),
      $header = $('.js-fixed').first();

  let scrollTop = window.scrollY,
      diff = Math.abs(prevScrollTop - scrollTop);

  // static header visible
  if (scrollTop < headerBottom) {
    $header.removeClass('is-transition');

    // remove all classes related to fixed header
    $body.removeClass('is-header-fixed');
    $header.css('opacity', '');
    $button.css('opacity', '0');

    // set current scrollTop to top breakpoint
    prevScrollTop = headerBottom;
  }
  // make header fixed
  else {
    if ($body.hasClass('is-header-fixed')) {
      $header.addClass('is-transition');
    }

    $body.addClass('is-header-fixed');

    let height = 1.5 * (headerBottom + header.offsetHeight);

    // scroll down => hide header
    if (scrollTop < height || (prevScrollTop < scrollTop && delta < diff)) {
      $header.css('opacity', '0');
      $button.css('opacity', '0');
    }
    // scroll up => show header
    else if (prevScrollTop > scrollTop && delta < diff) {
      $header.css('opacity', '1');
      $button.css('opacity', '1');
    }

    // change of header state
    if (delta < diff) {
      prevScrollTop = scrollTop;
    }
  }
};
