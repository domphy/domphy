declare module "page" {
  interface Context {
    params: Record<string, string>;
    path: string;
    pathname: string;
    hash: string;
    querystring: string;
    state: unknown;
  }
  type Callback = (ctx: Context, next?: () => void) => void;
  interface Static {
    (path: string, ...callbacks: Callback[]): void;
    start(options?: {
      click?: boolean;
      popstate?: boolean;
      dispatch?: boolean;
    }): void;
    stop(): void;
    redirect(from: string, to: string): void;
    redirect(to: string): void;
    show(path: string, state?: unknown, push?: boolean): void;
    base(path: string): void;
    current: string;
  }
  const page: Static;
  export default page;
  export type { Context, Callback, Static };
}

// GeoJSON asset served to the playground under this specifier by
// docs/editor/Modules.ts (moduleMap["geo/world.json"] = ./world.geo.json).
declare module "geo/world.json" {
  interface GeoJSONGeometry {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  }
  interface GeoJSONFeature {
    type: "Feature";
    properties: { name: string };
    geometry: GeoJSONGeometry;
  }
  interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
  }
  const world: GeoJSONFeatureCollection;
  export default world;
  export type { GeoJSONGeometry, GeoJSONFeature, GeoJSONFeatureCollection };
}
