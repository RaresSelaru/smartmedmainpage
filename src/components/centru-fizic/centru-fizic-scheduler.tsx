"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessagesSquare,
} from "lucide-react";
import { useState } from "react";

import styles from "./centru-fizic-scheduler.module.css";

const months = [
  {
    label: "Iulie 2026",
    monthName: "iulie",
    days: 31,
    offset: 2,
    available: [27, 28, 29, 30, 31],
  },
  {
    label: "August 2026",
    monthName: "august",
    days: 31,
    offset: 5,
    available: [3, 4, 5, 6, 7, 10, 11, 12, 13, 14],
  },
] as const;

const weekDays = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"] as const;
const timeSlots = ["16:00", "17:30", "19:00"] as const;

export function CentruFizicScheduler() {
  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(28);
  const [selectedTime, setSelectedTime] = useState<string>("17:30");
  const month = months[monthIndex];
  const cells = [
    ...Array.from({ length: month.offset }, () => null),
    ...Array.from({ length: month.days }, (_, index) => index + 1),
  ];

  function changeMonth(nextIndex: number) {
    const nextMonth = months[nextIndex];

    if (!nextMonth) {
      return;
    }

    setMonthIndex(nextIndex);
    setSelectedDay(nextMonth.available[0]);
    setSelectedTime(timeSlots[0]);
  }

  return (
    <div className={styles.scheduler}>
      <div className={styles.schedulerIntro}>
        <div className={styles.introIcon}>
          <CalendarDays aria-hidden="true" />
        </div>
        <p className={styles.status}>Calendar orientativ</p>
        <h3>Vizită de orientare în centrul SmartMed</h3>

        <div className={styles.duration}>
          <Clock3 aria-hidden="true" />
          Aproximativ 30 de minute
        </div>

        <p className={styles.introCopy}>
          O discuție calmă și concretă despre obiectivul tău, ritmul de pregătire și felul în
          care poate arăta parcursul în centrul fizic.
        </p>

        <ul>
          <li>
            <CheckCircle2 aria-hidden="true" />
            Clarificăm nivelul și obiectivul admiterii
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            Discutăm opțiunile de grupă și program
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            Primești răspuns la întrebările administrative
          </li>
        </ul>

        <div className={styles.orientationNote}>
          <MessagesSquare aria-hidden="true" />
          <p>
            <strong>Fără rezervare automată</strong>
            Ziua și ora sunt confirmate separat de echipa SmartMed.
          </p>
        </div>
      </div>

      <div className={styles.calendarPanel}>
        <div className={styles.calendarTopline}>
          <div>
            <p>Selectează o zi</p>
            <h3>{month.label}</h3>
          </div>
          <div className={styles.monthControls}>
            <button
              aria-label="Luna anterioară"
              disabled={monthIndex === 0}
              onClick={() => changeMonth(monthIndex - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Luna următoare"
              disabled={monthIndex === months.length - 1}
              onClick={() => changeMonth(monthIndex + 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.weekDays} aria-hidden="true">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className={styles.daysGrid} role="grid" aria-label={`Calendar ${month.label}`}>
          {cells.map((day, index) => {
            if (day === null) {
              return <span aria-hidden="true" key={`blank-${index}`} />;
            }

            const available = (month.available as readonly number[]).includes(day);
            const selected = day === selectedDay;

            return (
              <button
                aria-label={`${day} ${month.monthName} 2026${
                  available ? ", intervale orientative disponibile" : ", indisponibil"
                }`}
                aria-selected={selected}
                className={selected ? styles.selectedDay : ""}
                disabled={!available}
                key={day}
                onClick={() => setSelectedDay(day)}
                role="gridcell"
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className={styles.availabilityLegend}>
          <span>
            <i className={styles.availableDot} />
            Zi orientativ disponibilă
          </span>
          <span>
            <i className={styles.unavailableDot} />
            Indisponibil
          </span>
        </div>

        <div className={styles.timePicker}>
          <p>Alege un interval orientativ</p>
          <div>
            {timeSlots.map((time) => (
              <button
                aria-pressed={selectedTime === time}
                className={selectedTime === time ? styles.selectedTime : ""}
                key={time}
                onClick={() => setSelectedTime(time)}
                type="button"
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite" className={styles.selectionSummary}>
          <div>
            <span>Selecția ta orientativă</span>
            <strong>
              {selectedDay} {month.monthName}, ora {selectedTime}
            </strong>
          </div>
          <Link href="/contact">
            Continuă către contact
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
