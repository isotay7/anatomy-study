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
  });
})();
