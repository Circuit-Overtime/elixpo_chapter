export interface NewsItem {
  audio_url: string;
  topic: string;
  image_url: string;
  source_link: string;
}

export interface News {
  id: string;
  items: NewsItem[];
}

export interface NewsDetails {
  latestNewsId: string;
  latestNewsThumbnail: string;
  latestNewsSummary: string;
  latestNewsDate: string;
}

export interface Podcast {
  id: string;
  podcast_name: string;
  podcast_audio_url: string;
  topic_source: string;
  podcast_banner_url: string;
}

export interface PodcastDetails {
  latestPodcastID: string;
  latestPodcastName: string;
  latestPodcastThumbnail: string;
}

export interface CurrentWeather {
  datetime: string;
  temperature: number;
  condition: string;
  wind_speed: number;
}

export interface ForecastDay {
  day: string;
  date: string;
  high: number;
  low: number;
  condition: string;
}

export interface StructuredWeather {
  location: string;
  current: CurrentWeather;
  forecast: ForecastDay[];
}

export interface WeatherResponse {
  structuredWeather: StructuredWeather;
  aiSummary: string;
  aiImageLink: string;
  bannerLink: string;
}
