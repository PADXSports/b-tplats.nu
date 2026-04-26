export type MockBerth = {
  id: number;
  name: string;
  marinaName: string;
  city: string;
  specs: string[];
  pricePerMonth: number;
  availability: "available" | "limited" | "booked";
  lat: number;
  lng: number;
  imageSrc: string;
};

export const mockBerths: MockBerth[] = [
  {
    id: 101,
    name: "Berth A-12 - North Pier",
    marinaName: "Stockholms Segelsällskap",
    city: "Stockholm",
    specs: ["Electricity", "Fresh Water", "Wi-Fi"],
    pricePerMonth: 4500,
    availability: "available",
    lat: 59.3299,
    lng: 18.1217,
    imageSrc: "https://picsum.photos/seed/dock12/600/400",
  },
  {
    id: 102,
    name: "North Pier B-03",
    marinaName: "Djurgårdens Marina",
    city: "Stockholm",
    specs: ["Electricity", "Security", "Fuel nearby"],
    pricePerMonth: 3200,
    availability: "limited",
    lat: 59.3221,
    lng: 18.1332,
    imageSrc: "https://picsum.photos/seed/dock34/600/400",
  },
  {
    id: 103,
    name: "Brygga A · Plats 4",
    marinaName: "Bockholmen Marin",
    city: "Stockholm",
    specs: ["Electricity", "Fresh Water", "Parking"],
    pricePerMonth: 2800,
    availability: "booked",
    lat: 59.3829,
    lng: 18.0208,
    imageSrc: "/Bockholmen/IMG_2071.jpg",
  },
  {
    id: 104,
    name: "Södra Kajen C-08",
    marinaName: "Saltsjö Pir Marina",
    city: "Stockholm",
    specs: ["Water", "Shore power", "Service point"],
    pricePerMonth: 3900,
    availability: "available",
    lat: 59.3071,
    lng: 18.1548,
    imageSrc: "/Bockholmen/IMG_1603-2048x1536.jpeg",
  },
];
