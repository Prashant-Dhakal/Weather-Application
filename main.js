let resultData;
const city = document.querySelector("#city");
const countrySpan = city.querySelector("#country");
const temperature = document.querySelector("#temperature");
const wind = document.querySelector("#wind");
const fullDate = document.querySelector("#fullDate");
const searchInput = document.querySelector("#searchInput");
const searchbtn = document.querySelector("#searchBtn");
const forecastArea = document.querySelector("#forecast");
const searchResultArea = document.querySelector("#resultList");
const searchResultWrapper = document.querySelector("#searchResult");
let debounceTimer;

const weatherIcons = {
  sunny: "https://cdn-icons-png.flaticon.com/512/869/869869.png",
  clear: "https://cdn-icons-png.flaticon.com/512/869/869869.png",
  cloudy: "https://cdn-icons-png.flaticon.com/512/414/414825.png",
  rain: "https://cdn-icons-png.flaticon.com/512/414/414974.png",
  thunder: "https://cdn-icons-png.flaticon.com/512/3050/3050465.png",
  snow: "https://cdn-icons-png.flaticon.com/512/642/642102.png",
  fog: "https://cdn-icons-png.flaticon.com/512/728/728093.png",
  drizzle: "https://cdn-icons-png.flaticon.com/512/414/414974.png",
  default: "https://cdn-icons-png.flaticon.com/512/1163/1163624.png",
};

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchFunctionality();
  }, 800);
});

searchbtn.addEventListener("click", () => {
  searchFunctionality();
});

searchResultArea.addEventListener("click", (e) => {
  const target = e.target.closest(".resultName");
  if (!target) return;

  const index = target.dataset.id;
  const selected = resultData[index]?.formatted;

  if (selected) {
    searchInput.value = "";
    searchResultWrapper.classList.add("hidden");
    searchResultArea.innerHTML = "";
    getData(null, selected);
  }
});

document.addEventListener("click", (e) => {
  const isInside = searchResultWrapper.contains(e.target) || searchInput.contains(e.target);
  if (!isInside) {
    searchResultWrapper.classList.add("hidden");
  }
});


function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      reverseGeoCoding(latitude, longitude);
    });
  }
}

async function reverseGeoCoding(latitude, longitude) {
  const response = await axios.get("keys.json");
  const apiKey = response.data.key;
  const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}%2C+${longitude}&key=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    const components = response.data.results[0]?.components || {};

    let cityName = components?.city || components?.state || "Unknown";
    let country = components?.country || "Unknown";

    if (
      cityName.toLowerCase().includes(country.toLowerCase()) ||
      country.toLowerCase().includes(cityName.toLowerCase())
    ) {
      country = "";
    }

    const modifiedcity = cityName.split(" ")[0];

    if (modifiedcity) {
      getData(modifiedcity, null, country);
      city.innerHTML = country ? `${modifiedcity}, <span id="country">${country}</span>` : modifiedcity;
    }
  } catch (error) {
    alert("Unable to find your city");
  }
}

async function forwardGeoCoding(fromSearchInput, shouldRequestInfo) {
  const encodedInput = encodeURI(fromSearchInput);
  const response = await axios.get("keys.json");
  const apiKey = response.data.key;
  const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodedInput}&key=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    showSearchResult(response.data.results);
    const country = response.data.results[0]?.components?.country;

    if (shouldRequestInfo) {
      getData(null, fromSearchInput, country);
    }
  } catch (error) {
    console.log(error);
  }
}

function showSearchResult(results) {
  searchResultArea.innerHTML = "";
  resultData = results;

  if (!resultData || resultData.length === 0) {
    searchResultWrapper.classList.add("hidden");
    return;
  }

  searchResultWrapper.classList.remove("hidden");

  resultData.forEach((data, index) => {
    const formatted = data?.formatted;

    const entry = document.createElement("div");
    entry.className = "resultName border-b border-white/20 pb-4 cursor-pointer";
    entry.dataset.id = index;

    const text = document.createElement("p");
    text.className = "text-base font-medium";
    text.textContent = formatted;

    entry.appendChild(text);
    searchResultArea.appendChild(entry);
  });
}

async function getData(fromReverseGeoCodingCity, fromSearchInput, country) {
  const cityQuery = fromReverseGeoCodingCity || fromSearchInput;
  const apiUrl = `http://goweather.xyz/weather/${cityQuery}`;

  try {
    const response = await axios.get(apiUrl);
    const data = response.data;

    const cleanedTemp = cleanTemperatureString(data?.temperature);
    const windSpeed = data.wind;

    const today = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    const day = days[today.getDay()];
    const month = months[today.getMonth()];

    fullDate.innerHTML = `${day}, <span id="month">${month} <span id="date">${today.getDate()}</span> </span>`;

    if (fromSearchInput) {
      if (
        fromSearchInput.toLowerCase().includes(country?.toLowerCase()) ||
        country?.toLowerCase().includes(fromSearchInput.toLowerCase())
      ) {
        country = "";
      }
      city.innerHTML = country ? `${fromSearchInput}, <span id="country">${country}</span>` : fromSearchInput;
    }

    temperature.textContent = cleanedTemp;
    wind.textContent = windSpeed;

    const iconUrl = getWeatherIcon(data.description);
    let iconEl = city.querySelector("img.weather-icon");

    if (!iconEl) {
      iconEl = document.createElement("img");
      iconEl.classList.add("weather-icon");
      iconEl.style.width = "48px";
      iconEl.style.height = "48px";
      iconEl.style.marginLeft = "10px";
      iconEl.style.verticalAlign = "middle";
      city.appendChild(iconEl);
    }

    iconEl.src = iconUrl;
    iconEl.alt = data.description || "weather icon";

    forecast(data.forecast);
  } catch (error) {
    console.error(error);
  }
}

function searchFunctionality(suggestedInput) {
  const userInput = searchInput.value || suggestedInput;
  if (userInput) {
    forwardGeoCoding(userInput, suggestedInput);
  }
}

function forecast(forecastData) {
  const todayIndex = new Date().getDay();
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  forecastArea.innerHTML = "";

  forecastData.forEach((data) => {
    const modifiedTemp = cleanTemperatureString(data?.temperature);
    const dayNumber = parseInt(data?.day);
    const dayIndex = (todayIndex + dayNumber) % 7;
    const dayName = weekdays[dayIndex];
    const iconUrl = getWeatherIcon(data?.description || "");

    const card = `
      <div class="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-md border border-white/10 shadow">
        <p class="text-sm text-gray-300 mb-2">${dayName}</p>
        <img src="${iconUrl}" class="w-12 h-12 mx-auto mb-2" alt="forecast icon" />
        <p class="text-xl font-bold">${modifiedTemp}</p>
      </div>
    `;
    forecastArea.innerHTML += card;
  });
}

function cleanTemperatureString(str) {
  return str.replace(/[+C ]/g, "");
}

function getWeatherIcon(description) {
  if (!description) return weatherIcons.default;
  const desc = description.toLowerCase();
  for (const key in weatherIcons) {
    if (desc.includes(key)) return weatherIcons[key];
  }
  return weatherIcons.default;
}

getLocation();
