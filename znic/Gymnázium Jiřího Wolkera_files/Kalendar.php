
moment.locale('cs');
let calToday = moment();
let calSelected = calToday.clone();
let calMonth = calToday.clone().date(1);

const calWidget = document.getElementsByClassName('js-calendar')[0];
const calHeader = document.getElementsByClassName('js-calendar-header')[0];
const calPrev = document.getElementsByClassName('js-calendar-prev')[0];
const calNext = document.getElementsByClassName('js-calendar-next')[0];
const calRecords = document.getElementsByClassName('js-calendar-records')[0];

const calClassToday = 'c-calendar__today';
const calClassSelected = 'c-calendar__current';
const calClassInactive = 'c-calendar__inactive';

let calDays = [];

const Calendar = () => {
  if (typeof calWidget === 'undefined') {
    return;
  }

  let timestamp = calHeader.dataset.date;

  if (timestamp) {
    calSelected = moment.unix(timestamp);
    calMonth = calSelected.clone().date(1);
  }

  draw();

  calPrev.addEventListener('click', (event) => {
    event.preventDefault();
    calMonth.subtract(1, 'months');
    draw();
  });

  calNext.addEventListener('click', (event) => {
    event.preventDefault();
    calMonth.add(1, 'months');
    draw();
  });

  calWidget.addEventListener('click', (e) => {
    // loop parent nodes from the target to the delegation node
    for (var target = e.target; target && target != calWidget; target = target.parentNode) {
      if (target.matches('.js-calendar-row a')) {
        e.preventDefault();
        ajax(target);
        break;
      }
    }
  }, false);
};

const ajax = (a) => {
  calSelected = moment.unix(a.dataset.timestamp);
  calMonth = calSelected.clone().date(1);
  draw();

  var request = new XMLHttpRequest();
  request.open('GET', '/?cast=Strom&akce=kalendar&datum=' + a.dataset.timestamp, true);

  request.onload = function() {
    if (this.status >= 200 && this.status < 400) {
      var div = document.createElement('div');
      div.innerHTML = this.response;

      // Success!
      calRecords.innerHTML = div.firstChild.innerHTML;
    } else {
      // We reached our target server, but it returned an error
    }
  };

  request.send();
};

const draw = () => {
  drawHeader();

  calDays = [];
  backFill();
  currentMonth();
  forwardFill();

  drawMonth();
};

const drawHeader = () => {
  calHeader.innerHTML = calMonth.format('MMMM YYYY');
};

const backFill = () => {
  let clone = calMonth.clone();
  let weekDay = parseInt(clone.format('E')) - 1;

  if (!weekDay) {
    return
  }

  clone.subtract(weekDay + 1, 'days');

  for (let i = weekDay; i > 0; i--) {
    clone.add(1, 'days');
    pushDay(clone);
  }
};

const forwardFill = () => {
  let clone = calMonth.clone().add(1, 'months').subtract(1, 'days');
  let weekDay = parseInt(clone.format('E')) - 1;

  if (weekDay === 6) {
    return;
  }

  for (let i = weekDay; i < 6; i++) {
    clone.add(1, 'days');
    pushDay(clone);
  }
};

const currentMonth = () => {
  let clone = calMonth.clone();

  while (clone.month() === calMonth.month()) {
    pushDay(clone);
    clone.add(1, 'days');
  }
};

const pushDay = (day) => {
  let week = day.format('W');
  if (!(week in calDays)) {
    calDays[week] = [];
  }

  calDays[week].push(createDay(day));
}

const createDay = (day) => {
  var div = createElement('div', 'c-calendar__col');
  var a = createElement('a', getDayClass(day), day.format('D'));
  a.href = '#';
  a.dataset.timestamp = day.format('X');

  div.appendChild(a);
  return div;
};

const drawMonth = () => {
  calWidget.querySelectorAll('.js-calendar-row').forEach(el => {
    el.remove();
  });

  calDays.forEach(week => {
    var row = createElement('div', 'c-calendar__row js-calendar-row');
    week.forEach(day => {
      row.appendChild(day);
    });
    calWidget.appendChild(row);
  });
};

const getDayClass = (day) => {
  let classes = [];
  if (day.month() !== calMonth.month()) {
    classes.push(calClassInactive);
  } else if (calSelected.isSame(day, 'day')) {
    classes.push(calClassSelected);
  } else if (calToday.isSame(day, 'day')) {
    classes.push(calClassToday);
  }
  return classes.join(' ');
};

const createElement = (tagName, className = false, innerText = false) => {
  var element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (innerText) {
    element.innderText = element.textContent = innerText;
  }
  return element;
};

Calendar();
