import type { AppLanguage } from "@/types/models";

const ru = {
  tabs: {
    home: "Главная",
    journal: "Журнал",
    maintenance: "ТО",
    stats: "Статистика",
  },
  home: {
    title: "CarLog",
    noVehicleTitle: "Добавьте автомобиль",
    noVehicleBody:
      "Укажите название и начальный пробег — дальше можно вести заправки и расходы.",
    addVehicle: "Добавить автомобиль",
    currentOdometer: "Текущий пробег",
    placeholderStats: "Расход и расходы появятся после заправок (день 2+).",
    selectVehicle: "Выбрать автомобиль",
    settings: "Настройки",
  },
  vehicle: {
    newTitle: "Новый автомобиль",
    name: "Название",
    namePlaceholder: "Моя машина",
    make: "Марка",
    model: "Модель",
    year: "Год",
    fuelType: "Топливо",
    tankCapacity: "Объём бака, л",
    initialOdometer: "Начальный пробег, км",
    save: "Сохранить",
    nameRequired: "Введите название",
    odometerRequired: "Введите начальный пробег",
    odometerInvalid: "Пробег должен быть числом ≥ 0",
    freeLimit: "В бесплатной версии доступен один автомобиль",
    fuel: {
      petrol: "Бензин",
      diesel: "Дизель",
      lpg: "Газ",
      other: "Другое",
    },
  },
  settings: {
    title: "Настройки",
    comingSoon: "Единицы, язык и резервная копия — на день 5.",
  },
  common: {
    cancel: "Отмена",
    km: "км",
  },
} as const;

const en = {
  tabs: {
    home: "Home",
    journal: "Journal",
    maintenance: "Service",
    stats: "Stats",
  },
  home: {
    title: "CarLog",
    noVehicleTitle: "Add a vehicle",
    noVehicleBody:
      "Set a name and starting odometer — then track fuel and expenses.",
    addVehicle: "Add vehicle",
    currentOdometer: "Current odometer",
    placeholderStats: "Fuel economy and costs appear after refuels (day 2+).",
    selectVehicle: "Select vehicle",
    settings: "Settings",
  },
  vehicle: {
    newTitle: "New vehicle",
    name: "Name",
    namePlaceholder: "My car",
    make: "Make",
    model: "Model",
    year: "Year",
    fuelType: "Fuel",
    tankCapacity: "Tank size, L",
    initialOdometer: "Starting odometer, km",
    save: "Save",
    nameRequired: "Enter a name",
    odometerRequired: "Enter starting odometer",
    odometerInvalid: "Odometer must be a number ≥ 0",
    freeLimit: "Free version allows one vehicle",
    fuel: {
      petrol: "Petrol",
      diesel: "Diesel",
      lpg: "LPG",
      other: "Other",
    },
  },
  settings: {
    title: "Settings",
    comingSoon: "Units, language, and backup — day 5.",
  },
  common: {
    cancel: "Cancel",
    km: "km",
  },
};

const dictionaries = { ru, en } as const;

export function t(lang: AppLanguage) {
  return dictionaries[lang];
}
