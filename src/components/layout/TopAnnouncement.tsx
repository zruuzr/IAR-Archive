import { BabylonianIshtarFrieze } from './HeritageOrnaments';

/**
 * Top Babylonian Ishtar Gate Glazed Frieze crowning the page header,
 * matching the architectural Lapis-and-Brass rosette frieze at the footer.
 */
export function TopAnnouncement() {
  return (
    <div data-testid="top-announcement" className="w-full">
      <BabylonianIshtarFrieze testId="top-ishtar-frieze" />
    </div>
  );
}
