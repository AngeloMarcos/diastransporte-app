import frota1 from "@/assets/frota-1.jpeg.asset.json";
import frota2 from "@/assets/frota-2.jpeg.asset.json";
import frota3 from "@/assets/frota-3.jpeg.asset.json";
import frota4 from "@/assets/frota-4.jpeg.asset.json";
import frota5 from "@/assets/frota-5.jpeg.asset.json";
import frota6 from "@/assets/frota-6.jpeg.asset.json";
import frota7 from "@/assets/frota-7.jpeg.asset.json";
import frota8 from "@/assets/frota-8.jpeg.asset.json";

export const fotos = {
  cronosPredio: frota1.url,
  cronosNoite: frota2.url,
  cronosChuva: frota3.url,
  fileira: frota4.url,
  cronosTCross: frota5.url,
  tcrossCronos: frota6.url,
  cronosMar: frota7.url,
  frotaPorDoSol: frota8.url,
};

export const EMPRESA = {
  nome: "Dias Transporte",
  assinatura: "Do desembarque às dunas",
  base: "São Luís — MA",
  whatsapp: "559881506268",
  whatsappLabel: "(98) 98150-6268",
};

export type Rota = {
  id?: string;
  slug: string;
  origem: string;
  destino: string;
  ida_e_volta: boolean;
  duracao: string;
  distancia: string;
  precoPequeno: number;
  precoGrande: number | null;
  precoPequenoNoite?: number;
  precoGrandeNoite?: number | null;
  destaque?: string;
  popularidade: number;
  resumo: string;
  descricao: string;
  embarque: string[];
  foto: string;
  galeria: string[];
};

export const rotas: Rota[] = [
  {
    slug: "sao-luis-barreirinhas",
    origem: "São Luís",
    destino: "Barreirinhas",
    ida_e_volta: true,
    duracao: "≈ 4h",
    distancia: "260 km",
    precoPequeno: 650,
    precoGrande: 900,
    precoPequenoNoite: 650,
    precoGrandeNoite: 950,
    destaque: "Mais reservado",
    popularidade: 100,
    resumo:
      "O trajeto clássico do aeroporto de São Luís até a porta de entrada dos Lençóis Maranhenses.",
    descricao:
      "Saída de qualquer ponto de São Luís — aeroporto, rodoviária, hotéis ou pousadas — direto até sua hospedagem em Barreirinhas. Viagem em carro particular com ar-condicionado, motorista da casa e paradas para água e banheiro no caminho. Atendemos voos de qualquer horário, inclusive madrugada, e acompanhamos o status do seu voo para ajustar o embarque sem custo extra.",
    embarque: [
      "Aeroporto Marechal Cunha Machado (São Luís)",
      "Rodoviária de São Luís",
      "Hotéis e pousadas em São Luís, Calhau, Ponta d'Areia e Centro Histórico",
      "Hospedagens em Barreirinhas e beira do Rio Preguiças",
    ],
    foto: fotos.cronosPredio,
    galeria: [fotos.cronosPredio, fotos.cronosNoite, fotos.cronosChuva, fotos.fileira],
  },
  {
    slug: "sao-luis-santo-amaro",
    origem: "São Luís",
    destino: "Santo Amaro",
    ida_e_volta: true,
    duracao: "≈ 4h30",
    distancia: "230 km",
    precoPequeno: 700,
    precoGrande: 1050,
    destaque: "Entrada tranquila dos Lençóis",
    popularidade: 78,
    resumo:
      "Acesso direto ao lado mais preservado do Parque Nacional, com menos movimento de turistas.",
    descricao:
      "Transfer particular de São Luís até Santo Amaro do Maranhão, o acesso mais reservado do Parque Nacional dos Lençóis Maranhenses. Trecho final em estrada de areia feito com atenção e experiência: nossos motoristas fazem esse caminho todas as semanas. Embarque no aeroporto, na rodoviária ou na sua hospedagem em São Luís.",
    embarque: [
      "Aeroporto Marechal Cunha Machado (São Luís)",
      "Hotéis e pousadas em São Luís",
      "Pousadas em Santo Amaro do Maranhão",
    ],
    foto: fotos.cronosMar,
    galeria: [fotos.cronosMar, fotos.cronosTCross, fotos.tcrossCronos],
  },
  {
    slug: "barreirinhas-santo-amaro",
    origem: "Barreirinhas",
    destino: "Santo Amaro",
    ida_e_volta: true,
    duracao: "≈ 2h",
    distancia: "110 km",
    precoPequeno: 450,
    precoGrande: 550,
    popularidade: 70,
    resumo: "Ligação entre as duas bases dos Lençóis, sem depender de horário de van.",
    descricao:
      "Ideal para quem quer conhecer os dois lados do parque na mesma viagem. Saída no horário que você escolher, direto da sua pousada em Barreirinhas até Santo Amaro (ou o contrário), com bagagem acomodada e ar-condicionado.",
    embarque: ["Pousadas e hotéis em Barreirinhas", "Pousadas em Santo Amaro do Maranhão"],
    foto: fotos.tcrossCronos,
    galeria: [fotos.tcrossCronos, fotos.cronosChuva, fotos.frotaPorDoSol],
  },
  {
    slug: "barreirinhas-parnaiba",
    origem: "Barreirinhas",
    destino: "Parnaíba",
    ida_e_volta: false,
    duracao: "≈ 5h",
    distancia: "330 km",
    precoPequeno: 850,
    precoGrande: null,
    popularidade: 60,
    resumo: "Conexão da rota das emoções em direção ao Delta do Parnaíba.",
    descricao:
      "Trecho da Rota das Emoções entre Barreirinhas e Parnaíba, no Piauí. Viagem em carro particular, com paradas combinadas e horário de saída definido por você. Bagagem e prancha acomodadas conforme o veículo.",
    embarque: ["Pousadas e hotéis em Barreirinhas", "Hotéis e aeroporto de Parnaíba"],
    foto: fotos.cronosChuva,
    galeria: [fotos.cronosChuva, fotos.cronosPredio, fotos.fileira],
  },
  {
    slug: "barreirinhas-barra-grande",
    origem: "Barreirinhas",
    destino: "Barra Grande",
    ida_e_volta: false,
    duracao: "≈ 6h",
    distancia: "390 km",
    precoPequeno: 950,
    precoGrande: null,
    popularidade: 52,
    resumo: "Das dunas direto para o point de kitesurf do litoral piauiense.",
    descricao:
      "Transfer particular de Barreirinhas até Barra Grande (PI), destino de kite e vento constante. Espaço para equipamentos combinado na reserva. Saída no horário que você preferir.",
    embarque: ["Pousadas e hotéis em Barreirinhas", "Pousadas em Barra Grande"],
    foto: fotos.frotaPorDoSol,
    galeria: [fotos.frotaPorDoSol, fotos.cronosMar, fotos.cronosTCross],
  },
  {
    slug: "barreirinhas-jericoacoara",
    origem: "Barreirinhas",
    destino: "Jericoacoara",
    ida_e_volta: false,
    duracao: "≈ 9h",
    distancia: "600 km",
    precoPequeno: 1600,
    precoGrande: null,
    destaque: "Rota das Emoções",
    popularidade: 66,
    resumo: "A travessia completa dos Lençóis Maranhenses até as dunas de Jeri.",
    descricao:
      "A perna mais longa da Rota das Emoções, feita em carro particular e com motorista que conhece cada trecho. Paradas programadas para almoço e descanso, e entrega em Jericoacoara conforme o acesso permitido no dia.",
    embarque: ["Pousadas e hotéis em Barreirinhas", "Portaria de Jericoacoara / Jijoca"],
    foto: fotos.fileira,
    galeria: [fotos.fileira, fotos.cronosNoite, fotos.cronosMar],
  },
  {
    slug: "santo-amaro-parnaiba",
    origem: "Santo Amaro",
    destino: "Parnaíba",
    ida_e_volta: false,
    duracao: "≈ 6h",
    distancia: "380 km",
    precoPequeno: 950,
    precoGrande: null,
    popularidade: 44,
    resumo: "Saída de Santo Amaro seguindo para o Delta do Parnaíba.",
    descricao:
      "Transfer particular de Santo Amaro do Maranhão até Parnaíba, incluindo o trecho de areia até a estrada principal. Horário livre e acompanhamento do trajeto do começo ao fim.",
    embarque: ["Pousadas em Santo Amaro do Maranhão", "Hotéis e aeroporto de Parnaíba"],
    foto: fotos.cronosTCross,
    galeria: [fotos.cronosTCross, fotos.cronosMar, fotos.tcrossCronos],
  },
  {
    slug: "santo-amaro-barra-grande",
    origem: "Santo Amaro",
    destino: "Barra Grande",
    ida_e_volta: false,
    duracao: "≈ 7h",
    distancia: "440 km",
    precoPequeno: 1200,
    precoGrande: null,
    popularidade: 38,
    resumo: "Do lado mais silencioso dos Lençóis até o vento de Barra Grande.",
    descricao:
      "Viagem particular ligando Santo Amaro do Maranhão a Barra Grande, no Piauí. Ideal para quem está montando a Rota das Emoções sem depender de vans coletivas.",
    embarque: ["Pousadas em Santo Amaro do Maranhão", "Pousadas em Barra Grande"],
    foto: fotos.cronosNoite,
    galeria: [fotos.cronosNoite, fotos.frotaPorDoSol, fotos.fileira],
  },
  {
    slug: "santo-amaro-jericoacoara",
    origem: "Santo Amaro",
    destino: "Jericoacoara",
    ida_e_volta: false,
    duracao: "≈ 10h",
    distancia: "650 km",
    precoPequeno: 1700,
    precoGrande: null,
    popularidade: 40,
    resumo: "Travessia longa de Santo Amaro até Jericoacoara em carro exclusivo.",
    descricao:
      "Percurso completo entre Santo Amaro do Maranhão e Jericoacoara, com motorista dedicado, paradas para refeição e horário de saída combinado. Recomendamos sair no início da manhã.",
    embarque: ["Pousadas em Santo Amaro do Maranhão", "Portaria de Jericoacoara / Jijoca"],
    foto: fotos.cronosMar,
    galeria: [fotos.cronosMar, fotos.cronosPredio, fotos.tcrossCronos],
  },
];

export function getRota(slug: string) {
  return rotas.find((r) => r.slug === slug);
}

export function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function precoFinal(
  rota: Rota,
  carro: "pequeno" | "grande",
  periodo: "dia" | "noite",
): number | null {
  if (carro === "pequeno") {
    return periodo === "noite" ? (rota.precoPequenoNoite ?? rota.precoPequeno) : rota.precoPequeno;
  }
  return periodo === "noite" ? (rota.precoGrandeNoite ?? rota.precoGrande) : rota.precoGrande;
}

export const veiculos = [
  {
    nome: "Carro pequeno",
    modelo: "Fiat Cronos (ou similar)",
    passageiros: "Até 4 passageiros",
    bagagem: "3 malas médias",
    foto: fotos.cronosPredio,
    itens: ["Ar-condicionado", "Porta-malas fechado", "Ideal para casais e duplas"],
  },
  {
    nome: "Carro grande",
    modelo: "VW T-Cross (ou similar)",
    passageiros: "Até 5 passageiros",
    bagagem: "5 malas médias",
    foto: fotos.tcrossCronos,
    itens: ["Ar-condicionado", "Porta-malas amplo", "Ideal para famílias e grupos"],
  },
];
