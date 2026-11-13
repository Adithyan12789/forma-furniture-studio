/**
 * Studio control metadata: which numeric component params get sliders,
 * per generator. String params (styles/shapes) get option chips.
 */
export interface ParamSlider {
  component: string;
  param: string;
  label: string;
  min: number;
  max: number;
  step: number;
  format?: 'int' | 'mm' | 'cm';
}
export interface ParamOptions {
  component: string;
  param: string;
  label: string;
  options: { value: string; label: string }[];
}

export const PARAM_SLIDERS: Record<string, ParamSlider[]> = {
  chair: [
    { component: 'backrest', param: 'slats', label: 'Back slats', min: 1, max: 3, step: 1, format: 'int' },
    { component: 'backrest', param: 'curve', label: 'Slat curve', min: 0, max: 0.04, step: 0.002, format: 'mm' },
  ],
  sofa: [
    { component: 'seat', param: 'seats', label: 'Seats', min: 1, max: 4, step: 1, format: 'int' },
  ],
  armchair: [],
  'office-chair': [],
  table: [
    { component: 'drawers', param: 'count', label: 'Drawers', min: 1, max: 3, step: 1, format: 'int' },
    { component: 'top', param: 'thickness', label: 'Top thickness', min: 0.02, max: 0.06, step: 0.002, format: 'mm' },
  ],
  bed: [],
  wardrobe: [
    { component: 'doors', param: 'count', label: 'Doors', min: 1, max: 4, step: 1, format: 'int' },
  ],
  cabinet: [
    { component: 'drawers', param: 'count', label: 'Drawers', min: 0, max: 4, step: 1, format: 'int' },
  ],
  bookshelf: [
    { component: 'shelves', param: 'count', label: 'Shelf levels', min: 2, max: 7, step: 1, format: 'int' },
  ],
};

export const PARAM_OPTIONS: Record<string, ParamOptions[]> = {
  table: [
    {
      component: 'top', param: 'shape', label: 'Top shape',
      options: [
        { value: 'rect', label: 'Rectangular' },
        { value: 'round', label: 'Round' },
      ],
    },
    {
      component: 'legs', param: 'style', label: 'Leg style',
      options: [
        { value: 'tapered', label: 'Tapered' },
        { value: 'turned', label: 'Turned' },
        { value: 'panel', label: 'Panel' },
        { value: 'pedestal', label: 'Pedestal' },
      ],
    },
  ],
  bed: [
    {
      component: 'headboard', param: 'style', label: 'Headboard',
      options: [
        { value: 'panel', label: 'Panel' },
        { value: 'slats', label: 'Slatted' },
      ],
    },
  ],
};

/** Components whose enabled flag the generator actually honours (eye toggles). */
export const TOGGLEABLE: Record<string, string[]> = {
  chair: ['backrest', 'stretchers', 'cushion'],
  'office-chair': ['armrests'],
  armchair: ['armrests', 'backrest', 'feet'],
  sofa: ['armrests', 'backrest', 'feet'],
  table: ['apron', 'drawers', 'shelf'],
  bed: ['headboard', 'footboard', 'pillows'],
  wardrobe: ['doors'],
  cabinet: ['doors'],
  bookshelf: [],
};
