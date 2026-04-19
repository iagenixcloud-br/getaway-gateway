// ============================================================
// ANDRADE IMOBILIÁRIA CRM ELITE — Mock Data
// ============================================================

export type LeadStatus = "novo" | "atrasado" | "visitar" | "agendados" | "favoritos" | "fechado" | "arquivados";
export type LeadOrigin = "FB" | "IG" | "WA" | "Site" | "Indicação";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  origin: LeadOrigin;
  status: LeadStatus;
  property: string;
  waitingHours: number;
  avatar: string;
  budget: string;
  createdAt: string;
  healthScore: number;
}

export interface Property {
  id: string;
  title: string;
  neighborhood: string;
  city: string;
  type: "Apartamento" | "Cobertura" | "Penthouse" | "Casa" | "Mansão";
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpots: number;
  description: string;
  imageUrl: string;
  tour360Url: string;
  featured: boolean;
  tags: string[];
}

export interface Broker {
  id: string;
  name: string;
  avatar: string;
  totalSales: number;
  commission: number;
  dealsThisMonth: number;
  totalDeals: number;
  rank: number;
  medals: string[];
  conversionRate: number;
  status: "online" | "offline" | "busy";
}

// ─── LEADS ───────────────────────────────────────────────────
export const leads: Lead[] = [
  {
    id: "L001",
    name: "Ricardo Mendonça",
    phone: "(11) 98234-5671",
    origin: "IG",
    status: "novo",
    property: "Penthouse Jardins",
    waitingHours: 2,
    avatar: "https://i.pravatar.cc/150?img=11",
    budget: "R$ 4.2M",
    createdAt: "2026-03-30T08:14:00",
    healthScore: 92,
  },
  {
    id: "L002",
    name: "Fernanda Castelo",
    phone: "(11) 97456-8821",
    origin: "FB",
    status: "novo",
    property: "Cobertura Itaim",
    waitingHours: 5,
    avatar: "https://i.pravatar.cc/150?img=5",
    budget: "R$ 3.8M",
    createdAt: "2026-03-30T05:02:00",
    healthScore: 78,
  },
  {
    id: "L003",
    name: "Gustavo Albuquerque",
    phone: "(21) 99871-3340",
    origin: "WA",
    status: "atrasado",
    property: "Apto Alto Padrão Moema",
    waitingHours: 26,
    avatar: "https://i.pravatar.cc/150?img=15",
    budget: "R$ 2.5M",
    createdAt: "2026-03-29T17:30:00",
    healthScore: 55,
  },
  {
    id: "L004",
    name: "Isabela Vasconcelos",
    phone: "(11) 93312-7765",
    origin: "Site",
    status: "atrasado",
    property: "Mansão Alphaville",
    waitingHours: 48,
    avatar: "https://i.pravatar.cc/150?img=9",
    budget: "R$ 8.5M",
    createdAt: "2026-03-29T14:00:00",
    healthScore: 42,
  },
  {
    id: "L005",
    name: "Thiago Drummond",
    phone: "(11) 94456-1122",
    origin: "Indicação",
    status: "visitar",
    property: "Duplex Vila Nova",
    waitingHours: 0,
    avatar: "https://i.pravatar.cc/150?img=22",
    budget: "R$ 1.9M",
    createdAt: "2026-03-28T11:00:00",
    healthScore: 97,
  },
  {
    id: "L006",
    name: "Mariana Santana",
    phone: "(11) 98765-4321",
    origin: "IG",
    status: "agendados",
    property: "Penthouse Jardins",
    waitingHours: 0,
    avatar: "https://i.pravatar.cc/150?img=20",
    budget: "R$ 4.5M",
    createdAt: "2026-03-28T09:15:00",
    healthScore: 88,
  },
  {
    id: "L007",
    name: "Eduardo Figueiredo",
    phone: "(21) 97123-9988",
    origin: "FB",
    status: "favoritos",
    property: "Cobertura Itaim",
    waitingHours: 0,
    avatar: "https://i.pravatar.cc/150?img=33",
    budget: "R$ 3.6M",
    createdAt: "2026-03-27T16:45:00",
    healthScore: 95,
  },
  {
    id: "L008",
    name: "Camila Braga",
    phone: "(11) 96654-3310",
    origin: "WA",
    status: "favoritos",
    property: "Mansão Alphaville",
    waitingHours: 0,
    avatar: "https://i.pravatar.cc/150?img=16",
    budget: "R$ 9.2M",
    createdAt: "2026-03-27T10:30:00",
    healthScore: 99,
  },
  {
    id: "L009",
    name: "Bruno Lacerda",
    phone: "(31) 98834-5540",
    origin: "Site",
    status: "fechado",
    property: "Apto Alto Padrão Moema",
    waitingHours: 0,
    avatar: "https://i.pravatar.cc/150?img=40",
    budget: "R$ 2.3M",
    createdAt: "2026-03-25T14:00:00",
    healthScore: 100,
  },
  {
    id: "L010",
    name: "Letícia Novaes",
    phone: "(11) 95543-6670",
    origin: "Indicação",
    status: "arquivados",
    property: "Duplex Vila Nova",
    waitingHours: 0,
    avatar: "https://i.pravatar.cc/150?img=27",
    budget: "R$ 2.0M",
    createdAt: "2026-03-24T09:00:00",
    healthScore: 30,
  },
];

// ─── PROPERTIES ───────────────────────────────────────────────
export const properties: Property[] = [
  {
    id: "P001",
    title: "Penthouse Exclusive Jardins",
    neighborhood: "Jardins",
    city: "São Paulo",
    type: "Penthouse",
    price: 4200000,
    area: 520,
    bedrooms: 4,
    bathrooms: 5,
    parkingSpots: 4,
    description:
      "Penthouse de altíssimo padrão no coração dos Jardins. Varanda gourmet com vista panorâmica 360° da cidade, acabamentos importados, automação residencial completa e piscina privativa. Experiência única de morar no topo de São Paulo.",
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    tour360Url: "https://tour360.andrade.com.br/p001",
    featured: true,
    tags: ["Vista Panorâmica", "Piscina Privativa", "Automação", "Alto Padrão"],
  },
  {
    id: "P002",
    title: "Cobertura Duplex Itaim Bibi",
    neighborhood: "Itaim Bibi",
    city: "São Paulo",
    type: "Cobertura",
    price: 3800000,
    area: 380,
    bedrooms: 3,
    bathrooms: 4,
    parkingSpots: 3,
    description:
      "Cobertura duplex de design contemporâneo no Itaim, o bairro mais valorizado de SP. Terraço privativo de 120m² com jardim suspenso, cozinha gourmet profissional e tecnologia smart home de última geração.",
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    tour360Url: "https://tour360.andrade.com.br/p002",
    featured: true,
    tags: ["Terraço", "Jardim Suspenso", "Design Contemporâneo", "Smart Home"],
  },
  {
    id: "P003",
    title: "Apartamento Alto Padrão Moema",
    neighborhood: "Moema",
    city: "São Paulo",
    type: "Apartamento",
    price: 2500000,
    area: 220,
    bedrooms: 3,
    bathrooms: 3,
    parkingSpots: 2,
    description:
      "Apartamento refinado em Moema, a 300m do Parque Ibirapuera. Interiores assinados por arquiteto premiado, revestimentos de mármore carrara, closet planejado e varanda integrada à sala.",
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
    tour360Url: "https://tour360.andrade.com.br/p003",
    featured: false,
    tags: ["Próx. Ibirapuera", "Mármore Carrara", "Projeto Assinado"],
  },
  {
    id: "P004",
    title: "Mansão Condomínio Alphaville",
    neighborhood: "Alphaville",
    city: "Barueri",
    type: "Mansão",
    price: 8500000,
    area: 1200,
    bedrooms: 6,
    bathrooms: 8,
    parkingSpots: 8,
    description:
      "Mansão de 1.200m² em lote de 2.500m² no condomínio mais exclusivo de Alphaville. Piscina olímpica aquecida, quadra poliesportiva, cinema privativo, adega climatizada e casa de caseiro. Segurança 24h e máxima privacidade.",
    imageUrl:
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80",
    tour360Url: "https://tour360.andrade.com.br/p004",
    featured: true,
    tags: ["Piscina Olímpica", "Cinema", "Adega", "Condomínio Fechado"],
  },
  {
    id: "P005",
    title: "Duplex Moderno Vila Nova",
    neighborhood: "Vila Nova Conceição",
    city: "São Paulo",
    type: "Apartamento",
    price: 1900000,
    area: 180,
    bedrooms: 2,
    bathrooms: 3,
    parkingSpots: 2,
    description:
      "Duplex sofisticado em Vila Nova Conceição, bairro ultraexclusivo de SP. Pé-direito duplo de 6m, mezanino com biblioteca particular, cozinha americana de ilha e acabamentos de linha premium.",
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    tour360Url: "https://tour360.andrade.com.br/p005",
    featured: false,
    tags: ["Pé-Direito Duplo", "Mezanino", "Biblioteca", "Vila Nova"],
  },
];

// ─── BROKERS ──────────────────────────────────────────────────
export const brokers: Broker[] = [
  {
    id: "B001",
    name: "Rafael Andrade",
    avatar: "https://i.pravatar.cc/150?img=51",
    totalSales: 32400000,
    commission: 972000,
    dealsThisMonth: 4,
    totalDeals: 18,
    rank: 1,
    medals: ["🏆", "⭐", "💎", "🔥"],
    conversionRate: 34.5,
    status: "online",
  },
  {
    id: "B002",
    name: "Priscila Monteiro",
    avatar: "https://i.pravatar.cc/150?img=47",
    totalSales: 27800000,
    commission: 834000,
    dealsThisMonth: 3,
    totalDeals: 15,
    rank: 2,
    medals: ["🥈", "⭐", "💼"],
    conversionRate: 29.8,
    status: "online",
  },
  {
    id: "B003",
    name: "Carlos Eduardo Lima",
    avatar: "https://i.pravatar.cc/150?img=53",
    totalSales: 21500000,
    commission: 645000,
    dealsThisMonth: 2,
    totalDeals: 12,
    rank: 3,
    medals: ["🥉", "⭐"],
    conversionRate: 25.1,
    status: "busy",
  },
  {
    id: "B004",
    name: "Tatiane Oliveira",
    avatar: "https://i.pravatar.cc/150?img=45",
    totalSales: 18200000,
    commission: 546000,
    dealsThisMonth: 2,
    totalDeals: 10,
    rank: 4,
    medals: ["🎯"],
    conversionRate: 22.3,
    status: "online",
  },
  {
    id: "B005",
    name: "Marcos Vinicius",
    avatar: "https://i.pravatar.cc/150?img=60",
    totalSales: 12900000,
    commission: 387000,
    dealsThisMonth: 1,
    totalDeals: 7,
    rank: 5,
    medals: ["📈"],
    conversionRate: 18.6,
    status: "offline",
  },
];

// ─── KPI DATA ──────────────────────────────────────────────────
export const kpiData = {
  vgvTotal: 112800000,
  activeLeads: 47,
  conversionRate: 8.3,
  totalCommissions: 3384000,
  activeProperties: 23,
  onlineBrokers: 4,
  leadsThisMonth: 134,
  avgTicket: 3200000,
};
