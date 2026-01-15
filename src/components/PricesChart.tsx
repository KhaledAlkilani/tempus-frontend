import { Container, Button, Form } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import { FetchElectricityPricesService } from "../services/FetchElectricityPricesService";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Lottie from "lottie-react";
import animationData from "./loadingAnimation.json";
import "../styles/Chart.css";

interface Price {
  date: string;
  value: number;
}

export default function PricesChart() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<Price[]>([]);
  const [timePeriod, setTimePeriod] = useState<"today" | "week" | "month">(
    "today"
  );
  const [resolution, setResolution] = useState<"15min" | "1hour">("1hour");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem(
      `${timePeriod}_${resolution}_Data`
    );
    if (storedData) {
      setPrices(JSON.parse(storedData));
    } else {
      GetAndFormateData();
    }
  }, [timePeriod, resolution]);

  const isMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const mobileUserAgents = [
      "android",
      "iphone",
      "ipad",
      "ipod",
      "blackberry",
      "windows phone",
    ];

    const isMobileDevice = mobileUserAgents.some((mobileAgent) =>
      userAgent.toLowerCase().includes(mobileAgent)
    );
    const isMobileScreen = window.innerWidth <= 768;
    const isMobile = isMobileDevice || isMobileScreen;

    return isMobile;
  };

  async function GetAndFormateData() {
    setLoading(true);
    const data: Price[] = await FetchElectricityPricesService(timePeriod);

    let formattedData: Price[] = [];
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    switch (timePeriod) {
      case "today":
        formattedData = sortedData;
        break;

      case "week":
        const dictionary: Record<string, { total: number; count: number }> = {};

        sortedData.forEach((item) => {
          const dateObj = new Date(item.date);
          const formattedDate = `${dateObj.getDate()}.${
            dateObj.getMonth() + 1
          }.${dateObj.getFullYear()}`; // Format as "DD.MM.YYYY"

          if (!dictionary[formattedDate]) {
            dictionary[formattedDate] = { total: 0, count: 0 };
          }

          dictionary[formattedDate].total += item.value;
          dictionary[formattedDate].count += 1;
        });

        formattedData = Object.keys(dictionary).map((date) => ({
          date,
          value: Number(
            (dictionary[date].total / dictionary[date].count).toFixed(2)
          ), // Compute average
        }));
        formattedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        break;

      case "month":
        const monthlyDictionary: Record<
          string,
          { total: number; count: number }
        > = {};

        sortedData.forEach((item) => {
          const dateObj = new Date(item.date);
          const yearMonth = `${dateObj.getFullYear()}-${
            dateObj.getMonth() + 1
          }`; // "YYYY-MM"

          if (!monthlyDictionary[yearMonth]) {
            monthlyDictionary[yearMonth] = { total: 0, count: 0 };
          }

          monthlyDictionary[yearMonth].total += item.value;
          monthlyDictionary[yearMonth].count += 1;
        });

        formattedData = Object.keys(monthlyDictionary).map((month) => {
          const [year, monthNumber] = month.split("-");
          return {
            date: `${Number(monthNumber)}.${year}`, // Format as "MM.YYYY"
            value: Number(
              (
                monthlyDictionary[month].total / monthlyDictionary[month].count
              ).toFixed(2)
            ), // Compute average
          };
        });
        formattedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        break;

      default:
        break;
    }
    // Apply resolution ONLY when you're in "today" view (hourly series)
    if (timePeriod === "today") {
      if (resolution === "15min") {
        formattedData = expandHourlyTo15Min(formattedData);
      }

      formattedData = formattedData.map((item) => ({
        ...item,
        date: new Date(item.date).toLocaleTimeString("fi-FI", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
    }

    sessionStorage.setItem(
      `${timePeriod}_${resolution}_Data`,
      JSON.stringify(formattedData)
    );
    setLoading(false);
    setPrices(formattedData);
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      datalabels: {
        display: !isMobile(),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t("chart.x"), // Label for the x-axis (you can change this)
        },
      },
      y: {
        title: {
          display: true,
          text: t("chart.y"), // Label for the x-axis (you can change this)
        },
      },
    },
  };

  const today = new Date();
  const currentHour = today.getHours();
  const formattedTime = `${currentHour < 10 ? "0" : ""}${currentHour}:00`;

  const formattedData = {
    labels: prices.map((item) => item.date),
    datasets: [
      {
        label: t("chart.label"),
        data: prices.map((item) => item.value),
        backgroundColor: prices.map((item) =>
          item.date == formattedTime ? "rgba(255, 81, 0, 0.6)" : "#f5ba3c"
        ),
      },
    ],
  };

  function RenderTitle() {
    switch (timePeriod) {
      case "today":
        return <h3>{t("chart.chartTitleToday")}</h3>;

      case "week":
        return <h3>{t("chart.chartTitleWeek")}</h3>;

      case "month":
        return <h3>{t("chart.chartTitleMonth")}</h3>;

      default:
        return <h3>{t("chart.chartTitleToday")}</h3>;
    }
  }

  function expandHourlyTo15Min(sortedData: Price[]): Price[] {
    const expanded: Price[] = [];

    for (const item of sortedData) {
      const start = new Date(item.date);
      start.setMinutes(0, 0, 0);

      for (const m of [0, 15, 30, 45]) {
        const d = new Date(start);
        d.setMinutes(m, 0, 0);

        expanded.push({
          date: d.toISOString(),
          value: item.value,
        });
      }
    }

    return expanded;
  }
  function aggregate15MinToHourly(sorted15m: Price[]): Price[] {
    // group by hour start
    const groups: Record<
      string,
      { total: number; count: number; hourStart: Date }
    > = {};

    for (const item of sorted15m) {
      const d = new Date(item.date);
      const hourStart = new Date(d);
      hourStart.setMinutes(0, 0, 0);

      const key = hourStart.toISOString();
      if (!groups[key]) groups[key] = { total: 0, count: 0, hourStart };

      groups[key].total += item.value;
      groups[key].count += 1;
    }

    return Object.values(groups)
      .sort((a, b) => a.hourStart.getTime() - b.hourStart.getTime())
      .map((g) => ({
        date: g.hourStart.toISOString(),
        value: Number((g.total / g.count).toFixed(2)),
      }));
  }

  return (
    <>
      <div className="info-box-chart">
        <Container className="form-container">
          <div className="section">{RenderTitle()}</div>

          <Container className="chart-container">
            {loading ? (
              <div className="loading-animation-container">
                <div className="loading-animation">
                  <Lottie animationData={animationData} loop={true} />
                </div>
              </div>
            ) : (
              <Bar options={options} data={formattedData} />
            )}
          </Container>

          <div className="filter-options">
            <Form.Check
              type="checkbox"
              label={t("15min")}
              checked={resolution === "15min"}
              onChange={(e) =>
                setResolution(e.target.checked ? "15min" : "1hour")
              }
            />

            <Form.Check
              type="checkbox"
              label={t("1 hour")}
              checked={resolution === "1hour"}
              onChange={(e) =>
                setResolution(e.target.checked ? "1hour" : "15min")
              }
            />
            <Button
              onClick={() => setTimePeriod("today")}
              className={timePeriod == "today" ? "btn selected" : "btn"}
            >
              {t("day")}
            </Button>
            <Button
              onClick={() => setTimePeriod("week")}
              className={timePeriod == "week" ? "btn selected" : "btn"}
            >
              {t("week")}
            </Button>
            <Button
              onClick={() => setTimePeriod("month")}
              className={timePeriod == "month" ? "btn selected" : "btn"}
            >
              {t("month")}
            </Button>
          </div>
        </Container>
      </div>
    </>
  );
}
