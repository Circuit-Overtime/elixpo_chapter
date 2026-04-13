export interface NewsItem {
  audio_url: string;
  transcript_url: string;
  topic: string;
  category: string;
  image_url: string;
  source_link: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
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
  podcast_music_url: string;
  podcast_transcript_url: string;
  podcast_thumbnail_url: string;
  podcast_banner_url: string;
  topic_source: string;
}

export interface PodcastDetails {
  latestPodcastID: string;
  latestPodcastName: string;
  latestPodcastThumbnail: string;
  latestPodcastBanner: string;
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
