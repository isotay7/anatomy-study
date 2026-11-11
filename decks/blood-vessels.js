/* =====================================================================
   TOPIC: Blood Vessels Above the Diaphragm

   Each topic file calls registerDeck({...}) once. To add a new topic:
     1. Copy this file (e.g. decks/brain.js) and change the content.
     2. Add its file name to decks/index.js.

   terms[]   term : the name shown on the card
             def  : one-line definition
             pic  : which diagram to show ("art" or "vein" here)
             show : vessel id(s) to highlight in that diagram
             img  : OPTIONAL path to a real photo, e.g. "images/svc.jpg".
                    If set, the photo is shown instead of the drawing.

   labels    Label-the-Diagram game. Each item points at a vessel id and
             a spot along it (t: 0 = start of the vessel, 1 = end).
             side "L"/"R" = which column (viewer's left/right) the box is in.
             (For a photo-based topic use  at:[x, y]  instead of vessel/t.)

   figures   Real textbook figures (bottom of this file). Each term is shown
             on the figure that has a marker for it; the drawn diagrams
             are the fallback and the "Simple view".

   diagrams  The drawings. Coordinates are in SVG units. Patient's R is
             on the viewer's left. Vessels are
               [id, kind, path, startWidth, endWidth, options]
             kind: "a" artery (red), "v" vein (blue), "p" pulmonary
             (purple), "f" faded context. options.behind = drawn behind
             the heart (still shown on top when highlighted).
   ===================================================================== */
(function () {
  // ---- Shared body drawing (used by both diagrams) ----
  const BODY = [
    // neck, shoulders, arms, torso
    { style: "body", d:
      "M336 -15 L336 120 C334 165 312 195 262 210 C215 222 172 240 160 285 " +
      "C150 330 146 380 142 430 C138 490 132 550 128 605 C126 642 240 642 240 605 " +
      "C238 540 232 480 228 430 C226 380 240 330 268 305 C276 420 282 600 288 760 " +
      "L572 760 C578 600 584 420 592 305 C620 330 634 380 632 430 " +
      "C628 480 622 540 620 605 C620 642 734 642 732 605 C728 550 722 490 718 430 " +
      "C714 380 710 330 700 285 C688 240 645 222 598 210 C548 195 526 165 524 120 L524 -15 Z" },
    // head (top is cropped by the view)
    { style: "body", d: "M325 -15 a105 120 0 1 0 210 0 a105 120 0 1 0 -210 0" },
    // lungs
    { style: "lung", d: "M338 225 C305 228 284 290 280 380 C276 470 280 590 290 690 C320 690 345 680 362 660 L366 300 C364 255 355 228 338 225 Z" },
    { style: "lung", d: "M522 225 C555 228 576 290 580 380 C584 470 580 590 570 690 C540 690 515 680 498 660 L494 300 C496 255 505 228 522 225 Z" },
    // clavicles
    { style: "bone", d: "M410 222 C370 212 318 213 252 228" },
    { style: "bone", d: "M450 222 C490 212 542 213 608 228" },
    // diaphragm
    { style: "line", d: "M285 712 C330 668 395 668 430 688 C465 668 530 668 575 712" },
  ];
  const HEART = [
    { style: "heart", over: true, d:
      "M352 505 C330 525 322 575 336 612 C352 652 420 682 515 676 " +
      "C535 640 540 585 520 540 C500 498 450 482 410 488 C385 491 365 496 352 505 Z" },
    { style: "detail", over: true, d: "M462 500 C470 560 486 625 506 668" },
  ];
  const VIEW = [100, -50, 660, 780]; // x, y, width, height
  const FADE = [640, 760];           // body outline fades out between these heights

  registerDeck({
    id: "blood-vessels",
    title: "Blood Vessels Above the Diaphragm",
    short: "Blood Vessels",
    blurb: "Arteries, veins & pulmonary vessels of the head, neck, arms and thorax",
    icon: "icons/icon.svg",
    note: "Arteries red, veins blue, pulmonary vessels purple. Patient's R is on your left.",
    legend: [["a", "Arteries"], ["v", "Veins"], ["p", "Pulmonary"]],

    terms: [
      { term: "Brachiocephalic aa", def: "First of three branches off the aortic arch", pic: "art", show: ["brachio"] },
      { term: "L common carotid aa", def: "Second branch of the aortic arch; supplies L head, neck, brain", pic: "art", show: ["lcc"] },
      { term: "L subclavian aa", def: "Third branch of the aortic arch; supplies the L arm", pic: "art", show: ["lsub"] },
      { term: "Descending (thoracic) aorta", def: "Runs down off the arch as far as the diaphragm", pic: "art", show: ["desc"] },
      { term: "R and L coronary aa", def: "Come off either side of the root of the aorta", pic: "art", show: ["rcor", "lcor"] },
      { term: "R and L subclavian aa", def: "Deep to the clavicle, out to the lateral edge of the first rib", pic: "art", show: ["rsub", "lsub"] },
      { term: "R and L axillary aa", def: "Continuation of the subclavian, as far as teres major (edge of armpit)", pic: "art", show: ["rax", "lax"] },
      { term: "R and L brachial aa", def: "Continuation of the axillary, as far as the cubital fossa (inner elbow)", pic: "art", show: ["rbrach", "lbrach"] },
      { term: "R and L radial aa", def: "Branch of the brachial running along the radius", pic: "art", show: ["rrad", "lrad"] },
      { term: "R and L ulnar aa", def: "Branch of the brachial running along the ulna", pic: "art", show: ["rul", "lul"] },
      { term: "R and L external carotid aa", def: "Anterior branches of the common carotid; supply face and head", pic: "art", show: ["rext", "lext"] },
      { term: "R and L internal carotid aa", def: "Posterior branches of the common carotid; supply the brain", pic: "art", show: ["rint", "lint"] },
      { term: "Pulmonary trunk", def: "Comes off the R ventricle", pic: "vein", show: ["ptrunk"] },
      { term: "R and L pulmonary aa", def: "Branch off the pulmonary trunk; supply the R and L lungs", pic: "vein", show: ["rpa", "lpa"] },
      { term: "Superior vena cava", def: "Enters the R atrium; drains everything above the heart", pic: "vein", show: ["svc"] },
      { term: "Inferior vena cava", def: "Enters the R atrium; drains everything below the heart", pic: "vein", show: ["ivc"] },
      { term: "Coronary sinus", def: "Back of the heart between atria and ventricles; drains the heart's veins", pic: "vein", show: ["csinus"] },
      { term: "R and L external jugular vv", def: "External to the sternocleidomastoid; drain face and head", pic: "vein", show: ["rej", "lej"] },
      { term: "R and L internal jugular vv", def: "Internal to the sternocleidomastoid; drain the brain", pic: "vein", show: ["rij", "lij"] },
      { term: "Azygos vein", def: "Drains all the intercostal veins; empties into the SVC", pic: "vein", show: ["azygos"] },
    ],

    labels: {
      diagram: "art",
      title: "Aortic arch & branches",
      items: [
        { label: "R internal carotid aa", vessel: "rint", t: 0.7, side: "L" },
        { label: "R external carotid aa", vessel: "rext", t: 0.75, side: "L" },
        { label: "R common carotid aa", vessel: "rcc", t: 0.5, side: "L" },
        { label: "R subclavian aa", vessel: "rsub", t: 0.5, side: "L" },
        { label: "R axillary aa", vessel: "rax", t: 0.5, side: "L" },
        { label: "Brachiocephalic aa", vessel: "brachio", t: 0.5, side: "L" },
        { label: "Brachial aa", vessel: "rbrach", t: 0.5, side: "L" },
        { label: "Radial aa", vessel: "rrad", t: 0.65, side: "L" },
        { label: "Ulnar aa", vessel: "rul", t: 0.65, side: "L" },
        { label: "R coronary aa", vessel: "rcor", t: 0.75, side: "L" },
        { label: "L internal carotid aa", vessel: "lint", t: 0.7, side: "R" },
        { label: "L external carotid aa", vessel: "lext", t: 0.75, side: "R" },
        { label: "L common carotid aa", vessel: "lcc", t: 0.5, side: "R" },
        { label: "L subclavian aa", vessel: "lsub", t: 0.55, side: "R" },
        { label: "L axillary aa", vessel: "lax", t: 0.5, side: "R" },
        { label: "Arch aorta", vessel: "archAorta", t: 0.78, side: "R" },
        { label: "Descending aorta", vessel: "desc", t: 0.5, side: "R" },
        { label: "L coronary aa", vessel: "lcor", t: 0.75, side: "R" },
      ],
    },

    diagrams: {
      // Arteries: aortic arch and branches
      art: {
        view: VIEW, fade: FADE,
        shapes: BODY.concat(HEART),
        vessels: [
          ["archAorta", "a", "M414 505 C402 430 410 352 460 336 C505 322 545 350 547 425", 26, 22],
          ["desc", "a", "M547 420 C548 520 548 610 546 705", 22, 19],
          ["brachio", "a", "M440 347 C425 318 405 290 395 262", 16, 13],
          ["rcc", "a", "M395 262 C390 220 387 180 385 140", 11, 10],
          ["rint", "a", "M385 140 C380 105 375 70 372 28", 8, 6],
          ["rext", "a", "M385 140 C391 105 397 70 402 33", 7.5, 5.5],
          ["lcc", "a", "M480 332 C478 270 476 200 475 140", 11, 10],
          ["lext", "a", "M475 140 C469 105 463 70 458 33", 7.5, 5.5],
          ["lint", "a", "M475 140 C480 105 485 70 488 28", 8, 6],
          ["rsub", "a", "M395 262 C370 242 335 238 300 244", 11, 10],
          ["rax", "a", "M300 244 C265 250 235 262 212 280", 10, 9],
          ["rbrach", "a", "M212 280 C200 330 194 380 192 425", 9, 7.5],
          ["rrad", "a", "M192 425 C182 475 172 525 165 578", 6.5, 5],
          ["rul", "a", "M192 425 C200 475 210 525 220 578", 6.5, 5],
          ["lsub", "a", "M510 340 C520 300 535 265 560 248", 11, 10],
          ["lax", "a", "M560 248 C595 250 625 262 648 280", 10, 9],
          ["lbrach", "a", "M648 280 C660 330 666 380 668 425", 9, 7.5],
          ["lrad", "a", "M668 425 C678 475 688 525 695 578", 6.5, 5],
          ["lul", "a", "M668 425 C660 475 650 525 640 578", 6.5, 5],
          ["rcor", "a", "M410 503 C385 512 362 535 352 590", 6, 4],
          ["lcor", "a", "M420 503 C452 510 482 532 495 585", 6, 4],
        ],
      },
      // Veins, heart & pulmonary vessels
      vein: {
        view: VIEW, fade: FADE,
        shapes: BODY.concat(HEART),
        vessels: [
          ["azygos", "v", "M410 715 C410 600 410 460 410 385 C410 345 395 330 374 334", 9, 10, { behind: true }],
          ["ivc", "v", "M372 640 C372 670 372 695 372 725", 24, 24, { behind: true }],
          ["csinus", "v", "M350 598 C395 622 455 618 508 585", 10, 8, { behind: true }],
          ["rpa", "p", "M470 412 C440 402 370 396 295 410", 15, 11],
          ["aortaF", "f", "M420 500 C408 430 415 352 465 336 C510 322 550 350 552 425 L552 715", 22, 20],
          ["rsv", "f", "M352 240 C310 242 260 250 212 262", 11, 10],
          ["lsv", "f", "M508 240 C550 242 600 250 648 262", 11, 10],
          ["rbcv", "f", "M372 305 C366 285 358 262 352 240", 14, 13],
          ["lbcv", "f", "M372 305 C410 280 460 255 508 240", 13, 12],
          ["rij", "v", "M352 240 C358 180 366 110 378 30", 13, 10],
          ["lij", "v", "M508 240 C502 180 494 110 482 30", 13, 10],
          ["rej", "v", "M322 245 C333 190 348 130 366 72", 7, 5],
          ["lej", "v", "M538 245 C527 190 512 130 494 72", 7, 5],
          ["svc", "v", "M372 505 C372 440 372 370 372 300", 22, 20],
          ["ptrunk", "p", "M462 508 C466 470 470 440 470 412", 22, 20],
          ["lpa", "p", "M470 412 C495 402 530 398 565 410", 15, 11],
        ],
      },
    },

    /* Textbook figures (OpenStax, CC BY 3.0, via Wikimedia Commons; see the Credits screen).
       Fine-tune these with setup mode: open the app with #setup, adjust, tap "Copy coordinates",
       then replace that figure's whole block below with what you copied. */
    figures: {
    "aorta": {
      title: "Aorta", src: "images/aorta.jpg", w: 1264, h: 1347, fs: 2.04,
      credit: {"figure":"Figure 20.25","figTitle":"Aorta","file":"2121 Aorta.jpg","url":"https://commons.wikimedia.org/wiki/File:2121_Aorta.jpg"},
      view: [22, 0, 56, 97],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [9.91, 0.47, 19.73, 6.63, "R common carotid aa"],
        [75.74, 0.47, 18.31, 6.63, "L common carotid aa"],
        [0.42, 16.65, 22.26, 6.63, "R subclavian aa"],
        [75.82, 16.65, 20.27, 6.64, "L subclavian aa"],
        [0.42, 34.03, 21.55, 6.56, "Brachiocephalic aa"],
        [75.74, 35.81, 14.9, 2.92, "Arch aorta"],
        [75.89, 47.24, 24, 3.51, "Descending aorta"],
        [0.34, 48.13, 22.34, 3.51],
        [75.82, 56.6, 18.07, 6.63, "L coronary aa"],
        [0.42, 60.08, 20.05, 6.56, "R coronary aa"],
        [75.66, 72.26, 19.89, 2.92],
        [69.49, 83.02, 22.5, 2.92],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "Brachiocephalic aa": [[46, 26.7]],
        "L common carotid aa": [[58.1, 8.5]],
        "L subclavian aa": [[63.3, 19.7]],
        "Descending (thoracic) aorta": [[62.1, 48.8], [60.9, 73.9]],
        "R and L coronary aa": [[38, 62.5], [53, 59.4]],
        "R and L subclavian aa": [[32.4, 21.9], [63.3, 19.7]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
        "R and L coronary aa": [24, 35, 52, 40],
      },
    },
    "head-neck-arteries": {
      title: "Arteries of the head & neck", src: "images/head-neck-arteries.jpg", w: 1400, h: 1532, fs: 1.58,
      credit: {"figure":"Figure 20.26","figTitle":"Arteries Supplying the Head and Neck","file":"2122 Common Carotid Artery.jpg","url":"https://commons.wikimedia.org/wiki/File:2122_Common_Carotid_Artery.jpg"},
      view: [14, 22, 66, 66],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [78.05, 15.58, 21.4, 2.84],
        [78.12, 28.83, 10.04, 2.91],
        [1.26, 32.62, 9.61, 2.91],
        [1.41, 43.19, 16.11, 2.39, "Internal carotid aa"],
        [78.12, 50.24, 6.76, 2.39],
        [1.34, 52.2, 14.33, 2.45],
        [78.12, 56.9, 8.19, 2.91],
        [1.26, 61.93, 10.11, 2.39],
        [78.12, 68.98, 16.97, 2.39, "External carotid aa"],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "R and L external carotid aa": [[47.3, 59.3]],
        "R and L internal carotid aa": [[44.2, 48.8]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
      },
    },
    "arm-arteries": {
      title: "Arteries of the thorax & upper limb", src: "images/arm-arteries.jpg", w: 869, h: 1538, fs: 2.96,
      credit: {"figure":"Figure 20.31","figTitle":"Major Arteries Serving the Thorax and Upper Limb","file":"2127 Thoracic Upper Limb Arteries.jpg","url":"https://commons.wikimedia.org/wiki/File:2127_Thoracic_Upper_Limb_Arteries.jpg"},
      view: [20, 0, 80, 100],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [1.62, 1.31, 31.86, 2.85, "R subclavian aa"],
        [1.39, 8.07, 14.59, 2.85, "R axillary aa"],
        [1.62, 15.09, 37.38, 2.33],
        [1.62, 24.2, 26.91, 2.85],
        [1.62, 30.31, 15.86, 2.33, "Brachial aa"],
        [1.62, 37.33, 28.98, 2.33],
        [1.62, 51.9, 12.52, 2.33, "Radial aa"],
        [1.39, 58.98, 27.6, 5.26],
        [63.65, 69.52, 10.8, 2.33, "Ulnar aa"],
        [63.65, 82.65, 34.5, 2.85],
        [63.53, 86.36, 35.19, 5.26],
        [63.65, 93.18, 12.29, 2.85],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "R and L axillary aa": [[76.5, 14.6]],
        "R and L brachial aa": [[61.6, 35]],
        "R and L radial aa": [[46.5, 55]],
        "R and L ulnar aa": [[41.1, 70.6]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
        "R and L axillary aa": [30, 0, 70, 52],
        "R and L brachial aa": [30, 0, 70, 60],
        "R and L radial aa": [12, 38, 72, 50],
        "R and L ulnar aa": [12, 38, 72, 50],
      },
    },
    "thorax-veins": {
      title: "Veins of the thorax & abdomen", src: "images/thorax-veins.jpg", w: 1500, h: 1362, fs: 1.41,
      credit: {"figure":"Figure 20.36","figTitle":"Veins of the Thoracic and Abdominal Regions","file":"2132 Thoracic Abdominal Veins.jpg","url":"https://commons.wikimedia.org/wiki/File:2132_Thoracic_Abdominal_Veins.jpg"},
      view: [16, 0, 68, 62],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [81.35, 1.12, 8.97, 2.68],
        [81.48, 5.01, 14.37, 3.19, "Internal jugular vv"],
        [0.95, 7.94, 10.63, 5.18, "Superior vena cava"],
        [81.48, 9.56, 15.1, 3.19, "External jugular vv"],
        [81.42, 14.26, 10.7, 2.68],
        [1.02, 18, 11.1, 2.68],
        [81.42, 19.25, 15.17, 3.19],
        [81.35, 23.73, 7.43, 3.19],
        [1.08, 26.81, 11.5, 3.19],
        [81.42, 28.35, 8.7, 3.19],
        [0.88, 35.26, 8.03, 5.18],
        [81.42, 38.27, 11.97, 3.19],
        [0.95, 43.48, 7.57, 3.19, "Azygos vein"],
        [81.48, 45.9, 10.03, 2.68],
        [1.02, 48.69, 7.7, 3.12],
        [81.42, 51.19, 18.23, 2.61, "Inferior vena cava"],
        [1.08, 56.03, 5.97, 2.68],
        [81.48, 56.25, 7.57, 2.75],
        [1.02, 60.95, 8.43, 2.68],
        [81.35, 64.11, 7.83, 2.68],
        [1.02, 67.34, 7.77, 2.68],
        [0.95, 79.53, 13.3, 2.68],
        [1.08, 85.18, 11.7, 2.68],
        [1.08, 89, 12.37, 2.68],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "Superior vena cava": [[44.6, 26]],
        "Inferior vena cava": [[45.7, 46.6]],
        "Azygos vein": [[47.5, 40]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
      },
    },
    "head-neck-veins": {
      title: "Veins of the head & neck", src: "images/head-neck-veins.jpg", w: 1500, h: 1455, fs: 1.78,
      credit: {"figure":"Figure 20.37","figTitle":"Veins of the Head and Neck","file":"2133 Head and Neck Veins.jpg","url":"https://commons.wikimedia.org/wiki/File:2133_Head_and_Neck_Veins.jpg"},
      view: [22, 22, 56, 66],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [0.75, 7.79, 21.17, 2.99],
        [0.82, 12.53, 19.63, 2.99],
        [0.75, 17.27, 13.23, 2.99],
        [0.75, 22.01, 8.63, 2.99],
        [80.68, 23.59, 9.3, 2.99],
        [80.82, 31.5, 16.1, 2.51],
        [0.82, 36.31, 21.1, 2.92],
        [80.82, 37.82, 8.97, 2.99],
        [0.75, 41.12, 14.03, 2.99],
        [80.88, 43.46, 6.03, 2.58],
        [0.75, 46, 13.63, 2.99],
        [0.82, 50.88, 13.57, 2.51],
        [0.82, 55.69, 15.23, 2.99, "External jugular vv"],
        [80.88, 58.51, 14.5, 2.99, "Internal jugular vv"],
        [0.75, 60.57, 9.03, 2.51],
        [80.88, 76.31, 15.77, 2.92],
        [80.75, 81.74, 7.5, 2.92],
        [80.82, 87.17, 18.5, 2.99, "Superior vena cava"],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "R and L external jugular vv": [[44.6, 49.5]],
        "R and L internal jugular vv": [[53.2, 60]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
      },
    },
    "heart-surface": {
      title: "External heart", src: "images/heart-surface.jpg", w: 1600, h: 1505, fs: 1.15,
      credit: {"figure":"Figure 19.6","figTitle":"External Anatomy of the Heart","file":"2005 Surface Anatomy of the Heart.jpg","url":"https://commons.wikimedia.org/wiki/File:2005_Surface_Anatomy_of_the_Heart.jpg"},
      view: [33, 0, 44, 50],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [75.3, 1.98, 20.84, 2.62, "L common carotid aa"],
        [18.61, 2.31, 16.84, 2.62, "Brachiocephalic aa"],
        [75.3, 5.03, 16.78, 2.69, "L subclavian aa"],
        [18.61, 5.63, 15.09, 2.62, "Superior vena cava"],
        [75.24, 7.83, 18.46, 2.88, "Arch aorta"],
        [75.24, 9.76, 18.46, 2.88],
        [18.55, 9.29, 13.09, 4.68, "R pulmonary aa"],
        [75.3, 12.81, 16.78, 2.69, "L pulmonary aa"],
        [18.55, 14.74, 13.09, 2.88],
        [18.55, 16.67, 13.09, 2.88, "Pulmonary trunk"],
        [75.3, 15.93, 16.28, 2.62],
        [18.49, 19.99, 13.15, 4.28],
        [75.24, 20.72, 15.59, 2.29],
        [75.3, 24.77, 13.46, 2.69],
        [18.61, 25.17, 9.78, 2.69],
        [18.61, 28.69, 16.59, 2.62, "R coronary aa"],
        [75.3, 28.69, 15.46, 2.69, "L coronary aa"],
        [18.55, 31.75, 16.02, 2.29],
        [75.3, 33.41, 10.21, 2.29],
        [18.61, 34.8, 11.34, 2.69],
        [75.3, 38.12, 14.28, 2.29],
        [18.61, 38.26, 16.46, 2.95],
        [18.61, 40.26, 16.46, 2.95],
        [75.24, 40.72, 23.09, 2.69],
        [18.61, 43.84, 13.96, 2.29, "Inferior vena cava"],
        [75.24, 46.3, 4.59, 2.62],
        [35.55, 55.27, 4.84, 2.29],
        [75.3, 55.93, 15.15, 2.62, "Superior vena cava"],
        [75.36, 59.12, 17.84, 2.62, "R pulmonary aa"],
        [18.61, 60.38, 16.78, 2.69, "L pulmonary aa"],
        [75.36, 62.31, 17.28, 2.69],
        [18.61, 63.77, 16.21, 2.69],
        [75.36, 66.96, 9.71, 2.69],
        [18.55, 67.89, 15.59, 2.29],
        [18.61, 70.75, 8.65, 2.29],
        [75.36, 70.88, 13.9, 2.29, "Inferior vena cava"],
        [75.3, 74.01, 12.02, 2.69, "Coronary sinus"],
        [18.55, 74.2, 16.84, 4.68],
        [75.3, 77.26, 14.28, 2.29],
        [18.61, 79.59, 14.28, 2.29],
        [75.36, 80.38, 16.52, 2.69, "R coronary aa"],
        [18.61, 83.31, 12.78, 4.28],
        [75.36, 84.3, 23.71, 2.69],
        [75.3, 87.96, 14.96, 2.29],
        [18.61, 89.49, 10.21, 2.29],
        [75.36, 92.08, 11.28, 2.69],
        [31.93, 96.26, 4.59, 2.62],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "Pulmonary trunk": [[54.4, 18.1]],
        "R and L pulmonary aa": [[40.4, 13.4], [62.3, 12.5]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
      },
    },
    "heart-coronary": {
      title: "Coronary circulation", src: "images/heart-coronary.jpg", w: 1600, h: 1469, fs: 1.12,
      credit: {"figure":"Figure 19.15","figTitle":"Coronary Circulation","file":"2014ab Coronary Blood Vessels.jpg","url":"https://commons.wikimedia.org/wiki/File:2014ab_Coronary_Blood_Vessels.jpg"},
      view: [53, 45, 47, 50],
      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.
      boxes: [
        [1.11, 7.2, 8.59, 2.27, "Arch aorta"],
        [45.93, 8.63, 10.4, 4.66, "L coronary aa"],
        [1.11, 11.9, 12.71, 2.68],
        [45.99, 13.74, 12.71, 2.68, "Pulmonary trunk"],
        [1.11, 16.53, 11.46, 4.66, "R coronary aa"],
        [45.93, 16.94, 13.21, 2.68],
        [1.17, 23.06, 9.52, 2.68],
        [48.99, 25.92, 11.65, 6.7],
        [1.11, 27.69, 10.52, 2.34],
        [1.11, 32.39, 10.28, 4.25],
        [48.93, 35.79, 10.71, 4.32],
        [1.05, 38.92, 10.65, 4.32],
        [1.17, 45.53, 11.78, 2.68],
        [76.67, 46.89, 11.78, 2.68, "Coronary sinus"],
        [88.8, 46.89, 10.65, 4.25],
        [53.8, 52.47, 13.28, 2.68],
        [53.74, 55.6, 10.65, 4.25],
        [53.8, 60.5, 7.02, 4.72],
        [48.3, 67.52, 11.59, 6.7],
        [48.24, 75.62, 7.4, 6.29],
        [91.74, 85.42, 7.21, 6.7, "R coronary aa"],
        [70.43, 91.75, 11.34, 4.31],
        [82.8, 91.82, 6.96, 4.59],
      ],
      // pulsing highlight(s) for each term, [x, y] in %
      markers: {
        "Coronary sinus": [[82.3, 67.7]],
      },
      // optional crop per term (otherwise "view" is used)
      views: {
      },
    },
    },
  });
})();
