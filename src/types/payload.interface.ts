interface RootObject {
  event_type: string;
  events: Event[];
}

interface Event {
  project: string;
  repo_name: string;
  tag: string;
  full_name: string;
  trigger_time: number;
  image_id: string;
  project_type: string;
}

export default RootObject;
export { Event };