
$(function () {

  var $body = $('body'),
      $slides = $('.js-slide'),
      totalSlides = $slides.length,
      slidePosition = 0;

  if (totalSlides > 1) {
    bannerShowSlide(slidePosition);
  }

  $body.delegate('.js-slide-prev', 'click', function(event) {
    event.preventDefault();

    if (slidePosition == 0) {
      slidePosition = totalSlides - 1;
    }
    else {
      slidePosition = slidePosition - 1;
    }
    bannerShowSlide(slidePosition);

    return false;
  });

  $body.delegate('.js-slide-next', 'click', function (event) {
    event.preventDefault();

    if (slidePosition < (totalSlides - 1)) {
      slidePosition = slidePosition + 1;
    }
    else {
      slidePosition = 0;
    }
    bannerShowSlide(slidePosition);

    return false;
  });

});

function bannerShowSlide(slidePosition) {
  var $slides = $('.js-slide');
  $slides.removeClass('is-visible');
  $slides.eq(slidePosition).addClass('is-visible');
}
