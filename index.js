/**
 * @typedef {Object} ScheduleDay
 * @property {string[]} lessons
 */

/**
 * @typedef {Object} Schedule
 * @property {string} title
 * @property {number} lessonDuration
 * @property {string[]} starts
 * @property {ScheduleDay[]} schedule
 */

const axios = window.axios;

const moment = window.moment;
moment.updateLocale('uk', {
	week : {
		dow : 1
	}
});

const pageLoadDay = moment().dayOfYear();

function element(tag, classes, props, textContent, children) {
	const element = document.createElement(tag);
	if (classes) {
		classes = Array.isArray(classes) ? classes : [classes];
		element.classList.add(...classes);
	}
	if (props) {
		for (const key in props)
			element.setAttribute(key, props[key]);
	}
	if (textContent)
		element.textContent = textContent;
	if (children) {
		children = Array.isArray(children) ? children : [children];
		element.append(...children);
	}
	return element;
}

/** @returns {Promise<Schedule>} */
function loadSchedule(src) {
	return axios.get('/schedules/' + src + '.json').then(response => response.data);
}

function addProgress(container, start, end) {
	container.setAttribute('data-start', start.format('HH:mm'));
	container.setAttribute('data-end', end.format('HH:mm'));
	container.append(element('div', 'progress-background', null, null, [
		element('div', 'progress-indicator')
	]));
}

function renderLesson(schedule, number, lesson) {
	const container = element('li', ['with-progress', 'list-group-item', 'border-0',
		'position-relative', 'z-0', 'd-flex', 'align-items-center', 'gap-2']);
	const startStr = schedule.starts[number];
	let period = '';
	if (startStr && schedule.lessonDuration) {
		const start = moment(startStr, 'HH:mm');
		const end = moment(start).add(schedule.lessonDuration, 'minutes');
		period = start.format('HH:mm') + ' - ' + end.format('HH:mm');
		
		addProgress(container, start, end);
	}
	container.append(element('div', 'fw-bold', null, number + 1));
	container.append(element('div', null, null, lesson));
	container.append(element('small', ['flex-grow-1', 'flex-shrink-0', 'text-secondary', 'text-end'], null, period));
	return container;
}

function renderBreak(schedule, number) {
	const container = element('li', ['with-progress', 'lesson-break', 'list-group-item', 'border-0',
		'position-relative', 'z-0']);
	if (schedule.starts[number - 1] && schedule.starts[number] && schedule.lessonDuration) {
		const startMoment = moment(schedule.starts[number - 1], 'HH:mm').add(schedule.lessonDuration, 'minutes');
		const endMoment = moment(schedule.starts[number], 'HH:mm');
		const diff = moment.duration(endMoment.diff(startMoment)).humanize();
		addProgress(container, startMoment, endMoment);
		container.append(element('div', ['text-secondary', 'text-center'], null, 'Перерва ' + diff));
	}
	return container;
}

function renderDaySchedule(schedule, daySchedule, dayOfWeek) {
	// const time = moment().startOf('week').weekday(dayOfWeek);
	const time = moment().weekday(dayOfWeek);
	const isToday = moment().dayOfYear() === time.dayOfYear();
	
	const classes = ['card', 'pb-3'];
	if (isToday)
		classes.push('border-primary');
	const container = element('div', classes, {'data-day-of-week': dayOfWeek}, null);
	if (isToday) {
		container.id = 'today';
	}
	
	container.append(element('div', ['card-body', 'flex-grow-0', 'd-flex', 'align-items-baseline', 'gap-3'], null, null, [
		element('h4', ['my-0', 'text-capitalize'], null, time.format('dddd')),
		element('span', ['flex-grow-1', 'text-secondary', 'text-end'], null, time.format('D MMMM'))
	]));
	
	const lessons = element('ul', ['list-group', 'list-group-flush', 'border-0']);
	let number = 0;
	for (const lesson of daySchedule.lessons) {
		if (isToday && (number > 0))
			lessons.append(renderBreak(schedule, number));
		lessons.append(renderLesson(schedule, number, lesson));
		number++;
	}
	container.append(lessons);
	
	return container;
}

function renderSchedule(schedule) {
	const container = element('div');
	document.title = schedule.title;
	container.append(element('h1', 'mb-1', null, schedule.title));
	container.append(element('div', ['text-secondary', 'mb-4'], {id: 'current-time'}));
	
	const daysNode = element('div', ['timetable-grid'], {id: 'timetable'});
	let dayOfWeek = 0;
	for (const daySchedule of schedule.schedule) {
		daysNode.append(renderDaySchedule(schedule, daySchedule, dayOfWeek));
		dayOfWeek++;
	}
	container.append(daysNode);
	
	return container;
}

function tick() {
	const now = moment();
	
	if (pageLoadDay !== now.dayOfYear()) {
		window.location.reload();
		return;
	}
	
	const currentTime = document.getElementById('current-time');
	if (currentTime) {
		currentTime.textContent = now.format('D MMMM YYYY H:mm');
	}
	const currentDayNode = document.getElementById('today');
	if (currentDayNode) {
		currentDayNode.querySelectorAll('.with-progress').forEach(node => {
			const start = moment(node.getAttribute('data-start'), 'HH:mm');
			const end = moment(node.getAttribute('data-end'), 'HH:mm');
			if (now.isBetween(start, end)) {
				node.classList.add('active-progress');
				const progressNode = node.querySelector('.progress-indicator');
				if (progressNode) {
					const progress = now.diff(start) / end.diff(start);
					progressNode.style.width = progress * 100 + '%';
				}
			} else {
				node.classList.remove('active-progress');
			}
		});
	}
}

document.addEventListener("DOMContentLoaded", function() {
	const urlParams = new URLSearchParams(window.location.search);
	const scheduleSrc = urlParams.get('schedule') ?? '1a';
	const root = document.getElementById('root');
	
	if (!scheduleSrc) {
		root.append(element('div', ['text-center', 'text-danger'], {}, 'Розклад не знайдено'));
		document.getElementById('spinner').remove();
	}
	
	loadSchedule(scheduleSrc)
		.then(data => {
			root.append(renderSchedule(data));
			tick();
			window.setInterval(tick, 10000);
		})
		.catch(error => {
			console.error(error);
			root.append(element('div', ['text-center', 'text-danger'], {}, 'Помилка'));
		})
		.finally(() => document.getElementById('spinner').remove());
});