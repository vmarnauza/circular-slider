const data = {
  radius: 148,
  size: 360,
  handles: [
    {
      size: 48,
      angle: -90,
    },
    {
      size: 48,
      angle: 30,
    },
  ],
};
const container = document.querySelector(".container");

function init() {
  const slider = new Slider({
    container,
    size: data.size,
    radius: data.radius,
    handleData: data.handles,
  });

  slider.setup();
  slider.onUpdate = () => {
    updateValues(slider);
  };
  updateValues(slider);
}

function updateValues(slider) {
  const start = document.getElementById("start-value");
  const end = document.getElementById("end-value");

  start.innerText = slider.startValue.toFixed(2);
  end.innerText = slider.endValue.toFixed(2);
}

window.onload = init;

class Slider {
  constructor({ container, size, radius, handleData }) {
    this.container = container;
    this.size = size;
    this.radius = radius;
    this.handles = handleData.map(
      (handle) =>
        new Handle({
          size: handle.size,
          angle: handle.angle,
          slider: this,
          onUpdate: this.onHandleUpdate.bind(this),
        })
    );
    this.rangeDragged = false;
    this.rangeDragStartAngle = 0;
    this.onUpdate = null;
  }

  get center() {
    const containerRect = this.container.getBoundingClientRect();
    const x = containerRect.x + this.size / 2;
    const y = containerRect.y + this.size / 2;
    return { x, y };
  }

  get startValue() {
    const angle = normalizeAngle(this.handles[0].angle + 90);

    return angle / 360;
  }

  get endValue() {
    const angle = normalizeAngle(this.handles[1].angle + 90);

    return angle / 360;
  }

  onRangeMouseDown(event) {
    const mousePosition = { x: event.clientX, y: event.clientY };

    this.rangeDragStartAngle = findAngleBetweenPoints(
      this.center,
      mousePosition
    );
    this.rangeDragged = true;
  }

  onRangeMouseMove(event) {
    if (this.rangeDragged) {
      const mousePosition = { x: event.clientX, y: event.clientY };
      const angle = findAngleBetweenPoints(this.center, mousePosition);
      const delta = angle - this.rangeDragStartAngle;

      this.handles.forEach((handle) => {
        const angle = normalizeAngle(handle.angle + delta);

        handle.angle = angle >= 180 ? angle - 360 : angle;
        handle.setPosition();
      });

      this.rangeDragStartAngle = angle;
      this.onHandleUpdate();
    }
  }

  onRangeMouseUp() {
    this.rangeDragged = false;
  }

  onHandleUpdate() {
    this.drawRange();

    if (typeof this.onUpdate === "function") {
      this.onUpdate();
    }
  }

  drawRange() {
    const range = this.container.querySelector(".range");
    const handleAngles = this.handles.map((handle) => handle.angle);
    const half = this.size / 2;

    const arcData = describeArc(half, half, this.radius, ...handleAngles);

    range.setAttribute("d", arcData);
  }

  setupRange() {
    const range = this.container.querySelector(".range");

    range.addEventListener("mousedown", this.onRangeMouseDown.bind(this));
    range.addEventListener("touchstart", this.onRangeMouseDown.bind(this));
    document.addEventListener("mousemove", this.onRangeMouseMove.bind(this));
    document.addEventListener("touchmove", this.onRangeMouseMove.bind(this));
    document.addEventListener("mouseup", this.onRangeMouseUp.bind(this));
    document.addEventListener("touchend", this.onRangeMouseUp.bind(this));

    this.drawRange();
  }

  setup() {
    this.handles.forEach((handle) => handle.setup());

    this.setupRange();
  }
}

class Handle {
  constructor({ size, angle, slider, onUpdate }) {
    this.size = size;
    this.angle = angle;
    this.slider = slider;
    this.dragged = false;
    this.el = null;
    this.onUpdate = onUpdate;
  }

  get position() {
    return findPointAtAngle(
      this.slider.size / 2,
      this.slider.size / 2,
      this.angle,
      this.slider.radius
    );
  }

  onMouseDown() {
    this.dragged = true;
  }

  onMouseMove(event) {
    if (this.dragged) {
      const mousePosition = { x: event.clientX, y: event.clientY };
      const center = this.slider.center;

      this.angle = findAngleBetweenPoints(center, mousePosition);

      this.setPosition();
      this.onUpdate();
    }
  }

  attachListeners() {
    this.el.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.el.addEventListener("touchstart", this.onMouseDown.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("touchmove", this.onMouseMove.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("touchend", this.onMouseUp.bind(this));
  }

  onMouseUp() {
    this.dragged = false;
  }

  setPosition() {
    this.el.style.left = `${this.position.x}px`;
    this.el.style.top = `${this.position.y}px`;
  }

  setup() {
    this.el = document.createElement("button");

    this.el.classList.add("handle");
    this.el.style.width = `${this.size}px`;
    this.el.style.height = `${this.size}px`;
    this.setPosition();
    this.attachListeners();

    this.slider.container.appendChild(this.el);
  }
}

/* utils */
function normalizeAngle(angle) {
  if (angle < 0) {
    return 360 - (Math.abs(angle) % 360);
  }

  return angle % 360;
}

function findPointAtAngle(posX, posY, angle, distance) {
  const x = Math.round(Math.cos((angle * Math.PI) / 180) * distance + posX);
  const y = Math.round(Math.sin((angle * Math.PI) / 180) * distance + posY);

  return { x, y };
}

function findAngleBetweenPoints(p1, p2) {
  return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
}

// https://stackoverflow.com/questions/5736398/how-to-calculate-the-svg-path-for-an-arc-of-a-circle
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  let largeArcFlag = "0";
  if (endAngle >= startAngle) {
    largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  } else {
    largeArcFlag = endAngle + 360.0 - startAngle <= 180 ? "0" : "1";
  }

  const d = [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");

  return d;
}
