const https = require("https");

function fetchWeatherByCity(city) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    https
      .get(url, (response) => {
        let body = "";

        if (response.statusCode === 404) {
          return reject({ status: 404, message: "City not found" });
        }

        if (response.statusCode !== 200) {
          return reject({
            status: response.statusCode,
            message: `OpenWeather API error: ${response.statusCode}`
          });
        }

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({
              city: data.name,
              country: data.sys.country,
              temp: data.main.temp,
              feelsLike: data.main.feels_like,
              humidity: data.main.humidity,
              windSpeed: data.wind.speed,
              description: data.weather[0].description,
              icon: data.weather[0].icon,
              timestamp: data.dt
            });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function fetchWeatherByCoordinates(lat, lon) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    https
      .get(url, (response) => {
        let body = "";

        if (response.statusCode === 404) {
          return reject({ status: 404, message: "Location not found" });
        }

        if (response.statusCode !== 200) {
          return reject({
            status: response.statusCode,
            message: `OpenWeather API error: ${response.statusCode}`
          });
        }

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({
              city: data.name,
              country: data.sys.country,
              temp: data.main.temp,
              feelsLike: data.main.feels_like,
              humidity: data.main.humidity,
              windSpeed: data.wind.speed,
              description: data.weather[0].description,
              icon: data.weather[0].icon,
              timestamp: data.dt,
              coordinates: {
                lat: data.coord.lat,
                lon: data.coord.lon
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

module.exports = { fetchWeatherByCity, fetchWeatherByCoordinates };
