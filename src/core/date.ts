function getQuarter(date: Date) {
	return Math.floor(date.getMonth() / 3 + 1);
}

const baseDate = (
	date: string | Date = new Date()
) => {
	if (typeof date === 'string') {
		date = new Date(date);
	}
	date.setHours(0, 0, 0, 0);
	return date;
};

const addDays = (data: {
	date: Date;
	days: number;
}) => {
	const { date, days } = data;
	const newDate = baseDate(date);
	newDate.setDate(date.getDate() + days);
	return newDate;
};

const addWeeks = (data: {
	date: Date;
	weeks: number;
}) => {
	const { date, weeks } = data;
	return addDays({ date, days: weeks * 7 });
};

const addMonths = (data: {
	date: Date;
	months: number;
}) => {
	const { date, months } = data;
	const newDate = baseDate(date);
	newDate.setMonth(date.getMonth() + months);
	return newDate;
};

const addQuarters = (data: {
	date: Date;
	quarters: number;
}) => {
	const { date, quarters } = data;
	//Remove middle months
	const quarter = getQuarter(date);
	const newDate = baseDate(date);
	newDate.setMonth(
		date.getMonth() -
			(date.getMonth() - quarter * 3) -
			1
	);
	//add months
	return addMonths({
		date: newDate,
		months: quarters * 3
	});
};

const addYears = (data: {
	date: Date;
	years: number;
}) => {
	const { date, years } = data;
	const newDate = baseDate(date);
	newDate.setFullYear(date.getFullYear() + years);
	return newDate;
};

const toISOString = (date: Date) => date.toISOString();

export const today = () => toISOString(baseDate());

export const day = (data: {
	date?: string;
	amount: number;
}) => {
	const { date, amount } = data;
	return toISOString(
		addDays({ date: baseDate(date), days: amount })
	);
};
export const week = (data: {
	date?: string;
	amount: number;
}) => {
	const { date, amount } = data;
	const newDate = baseDate(date);
	const startOfWeek = newDate.setDate(
		newDate.getDate() - newDate.getDay()
	);
	newDate.setDate(startOfWeek);
	return toISOString(
		addWeeks({ date: newDate, weeks: amount })
	);
};
export const month = (data: {
	date?: string;
	amount: number;
}) => {
	const { date, amount } = data;
	const newDate = baseDate(date);
	newDate.setDate(0);
	return toISOString(
		addMonths({ date: newDate, months: amount })
	);
};
export const year = (data: {
	date?: string;
	amount: number;
}) => {
	const { date, amount } = data;
	const newDate = baseDate(date);
	newDate.setDate(0);
	newDate.setMonth(0);
	return toISOString(
		addYears({ date: newDate, years: amount })
	);
};
export const quarter = (data: {
	date?: string;
	amount: number;
}) => {
	const { date, amount } = data;
	const newDate = baseDate(date);
	const quarter = getQuarter(newDate);
	newDate.setMonth(quarter * 3);
	return toISOString(
		addQuarters({ date: newDate, quarters: amount })
	);
};

export const currentDay = () => {
	const date = baseDate();
	date.setHours(0, 0, 0, 0);
	return toISOString(date);
};

export const currentWeek = () => {
	const date = baseDate();
	const startOfWeek = date.setDate(
		date.getDate() - date.getDay()
	);
	date.setDate(startOfWeek);
	return toISOString(date);
};

export const currentMonth = () => {
	const date = baseDate();
	date.setDate(0);
	return toISOString(date);
};

export const currentYear = () => {
	const date = baseDate();
	date.setDate(0);
	date.setMonth(0);
	return toISOString(date);
};

export const currentQuarter = () => {
	const date = baseDate();
	const quarter = getQuarter(date);
	date.setMonth(quarter * 3);
	return toISOString(date);
};