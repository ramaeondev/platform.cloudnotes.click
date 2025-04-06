
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

const Calendar = ({ calendarData, onDateSelect, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  };
  
  const days = getDaysInMonth(currentMonth);
  
  const prevMonth = () => {
    setCurrentMonth(prevDate => subMonths(prevDate, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(prevDate => addMonths(prevDate, 1));
  };
  
  const getNotesCountForDay = (day) => {
    const calendarDay = calendarData.find(data => 
      isSameDay(new Date(data.date), day)
    );
    return calendarDay ? calendarDay.notesCount : 0;
  };
  
  const getCategoriesForDay = (day) => {
    const calendarDay = calendarData.find(data => 
      isSameDay(new Date(data.date), day)
    );
    return calendarDay ? calendarDay.categories : {};
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-sidebar-accent focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h2 className="text-sm font-medium">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-sidebar-accent focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
            <path d="m9 6 6 6-6 6"/>
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="text-sidebar-foreground/60">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const notesCount = getNotesCountForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const categories = getCategoriesForDay(day);
          const hasNotes = notesCount > 0;
          
          return (
            <div key={index} className="relative py-1">
              <button
                onClick={() => onDateSelect(day)}
                className={`
                  calendar-day
                  ${isToday ? 'font-bold' : ''}
                  ${isSelected ? 'calendar-day-active' : ''}
                  ${hasNotes ? 'calendar-day-has-notes' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
              
              {hasNotes && (
                <div className="flex justify-center mt-1 space-x-1">
                  {Object.entries(categories).slice(0, 2).map(([categoryId, count], idx) => (
                    <div 
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full bg-cloudnotes-accent-${
                        ['blue', 'green', 'purple', 'red', 'yellow', 'pink'][idx % 6]
                      }`}
                    ></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
