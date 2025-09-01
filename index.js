function element(tag, classes, props, textContent, children) {
	const element = document.createElement(tag);
	if (classes) {
		classes = Array.isArray(classes) ? classes : [classes];
		element.classList.add(...classes);
	}
	if (props) {
		for (const key in props)
			element[key] = props[key];
	}
	if (textContent)
		element.textContent = textContent;
	if (children) {
		children = Array.isArray(children) ? children : [children];
		element.append(...children);
	}
	return element;
}

function loadSchedule(src) {
	return axios.get('/schedules/' + src);
}

function timeToMinutes(time) {
	if (Number.isInteger(time))
		return time;
	const [hours, minutes] = time.split(":");
	return hours * 60 + +minutes;
}

function minutesToTime(minutes) {
	const hours = Math.trunc(minutes / 60);
	minutes = minutes % 60;
	return hours + ":" + minutes;
}

function lessonPeriod(start, addition) {
	if (!start)
		return '';
	return start + " - " + minutesToTime(timeToMinutes(start) + addition);
}

function renderLesson(schedule, number, lesson) {
	const container = element('div', ['d-flex', 'align-items-center', 'gap-3']);
	container.append(element('div', ['fw-bold'], null, number));
	container.append(element('div', null, null, lesson));
	container.append(element('div', ['flex-grow-1', 'text-secondary', 'text-end'], null, lessonPeriod(schedule.start[number], schedule.lessonDuration)));
	return container;
}

function renderDaySchedule(schedule, daySchedule) {
	const container = element('div', 'card-body');
	container.append(element('h4', ['card-title', 'mb-3'], null, daySchedule.day));
	
	const lessons = element('div', ['d-flex', 'flex-column', 'gap-2']);
	let number = 1;
	for (const lesson of daySchedule.lessons) {
		lessons.append(renderLesson(schedule, number, lesson));
		number++;
	}
	container.append(lessons);
	
	return element('div', 'card', null, null, container);
}

function renderSchedule(schedule) {
	const container = element('div');
	container.append(element('h1', 'mb-5', {}, schedule.title));
	document.title = schedule.title;
	
	const daysNode = element('div', ['timetable-grid']);
	for (const daySchedule of schedule.schedule) {
		daysNode.append(renderDaySchedule(schedule, daySchedule));
	}
	container.append(daysNode);
	
	return container;
}

document.addEventListener("DOMContentLoaded", function() {
	const scheduleSrc = document.getElementById('schedule-src')?.value;
	const root = document.getElementById('root');
	
	if (!scheduleSrc) {
		root.append(element('div', ['text-center', 'text-danger'], {}, 'Розклад не знайдено'));
		document.getElementById('spinner').remove();
	}
	
	loadSchedule(scheduleSrc)
		.then(response => {
			root.append(renderSchedule(response.data));
		})
		.catch(() => root.append(element('div', ['text-center', 'text-danger'], {}, 'Помилка')))
		.finally(() => document.getElementById('spinner').remove());
});