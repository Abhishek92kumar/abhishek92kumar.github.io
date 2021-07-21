function Simulation() {
    const spectrumLimit = [247, 161, 346, 57]
    const intensityLimit = [236, 217, 189, 171]
    const batteryLimit = [92, 609, 260, 609]
    const ammeter = [426.5, 602]
    const ammeterNeedle = 42;
    const batteryTerminals = [104, 535, 230, 535]
    const batteryTerminalSize = 13;
    const cathodeX = 95;
    const anodeX = 592;
    const tubeLength = anodeX - cathodeX;
    const tubeCenterY = 317;
    const electrodeSize = 134;
    const clipTubeCoords = [93, 178, 591, 407]

    let bgColor = "rgb(0,64,84)";
    let fgColor = "rgb(255,255,255)";
    let electronColor = "red";

    const startX = 190;
    const startY = 220;
    let imgCircuit_0;

    let pulseMax = 100;
    let pulseType = [];
    let pulseX = [];
    let pulseY = [];
    let pulseW = [];
    let pulseL = [];
    let pulseV = [];
    let pulseT = [];
    let pulseA = [];
    let plotXc = 250;
    let plotX1 = 250 - 240;
    let plotX2 = 250 + 240;
    let plotY1 = 355;
    let plotY2 = 42;

    let canvas;
    let ctx;
    let pgPlotCanvas;
    let pgPlot;

    let photonPath;
    let electronPath;
    let rayFrustumPath;
    let rayFrustumGradient;

    let wavelength = 380;
    let hf; //energy of photon in eV
    let ek; //max KE of e in eV
    let wf; //work function in eV
    let saturationVoltage;
    let saturationCurrent;

    let intensity = 5;
    let intensitySum = 0;
    let voltage = 0;
    let selectA = 0;
    let current = 0;

    let checkB = false;

    let frameCount = 0;
//create gui
    let pane;
    let timer;
    let sliders = [];
    let mx, my;
    let initScale;
    let xOffset = 0;
    let yOffset = 0;
    let scale;
    let initialized = false;
    let workFunctions = [1.20, 2.12, 2.27, 2.51, 3.46, 3.74, 3.92, 4.18, 4.28];
    let metalNames = ["\u03C6 (1.20)", "Cs (2.12)", "Na (2.27eV)", "Ba (2.51eV)", "Mg (3.46eV)", "Zn (3.74eV)", "Cd (3.92eV)", "Co (4.18eV)", "Ag (4.28eV)"];
    let currentMetal = 1;


    function Slider(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.L = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        this.active = false;
        this.value = 0;
        this.object = null;
        this.property = null;
        this.max;
        this.min;
        this.incr;
        this.value;
        this.contains = function (x, y) {
            return distance(x, y, this.x1, this.y1, this.x2, this.y2) < 20;

        }
        this.dragStart = function (x, y) {
            if (this.contains(x, y)) {
                this.active = true;
                let dx = x - this.x1, dy = y - this.y1;
                let l = (dx * (this.x2 - this.x1) + dy * (this.y2 - this.y1)) / this.L;
                let v = (this.max - this.min) * l / this.L;
                console.log("dx = " + dx + " , dy=" + dy);
                v = this.min + Math.round(v / this.incr) * this.incr;

                if (v != this.object[this.property]) {
                    this.value = v;
                    this.object[this.property] = v;
                }
                // console.log(this.property+" = "+this.value);
                return true;
            }
            return false;
        }

        this.drag = function (dx, dy) {
            let l = (dx * (this.x2 - this.x1) + dy * (this.y2 - this.y1)) / this.L;
            this.value += (this.max - this.min) * l / this.L;
            let v = this.min + Math.round((this.value - this.min) / this.incr) * this.incr;
            if (v < this.min) v = this.min;
            if (v > this.max) v = this.max;
            if (v != this.object[this.property]) {
                this.object[this.property] = v;

            }
        }

        this.control = function (object, property, min, max, incr) {
            this.object = object;
            this.property = property;
            this.max = max;
            this.min = min;
            this.incr = incr;
        }

    }

    function resize() {
        if (window.innerWidth < 10 || window.innerHeight < 10) return;
        //scale*=window.innerWidth/canvas.width;
        canvas.width = window.innerWidth - 10;
        canvas.height = window.innerHeight - 10;
        draw();
    }


    function initialize(c, dirurl) {
        $.getScript(dirurl + "/hammer.js", function () {
            load(c, dirurl);
        });
    }

    function load(c, dirurl) {
        canvas = c;
        //canvas.width=Math.max(1200,window.innerWidth);
        //canvas.height=Math.max(660,window.innerHeight);
        scale = canvas.width / 1500;
        ctx = canvas.getContext('2d');
        pgPlotCanvas = createOffscreenCanvas(520, 520);
        pgPlot = pgPlotCanvas.getContext("2d");
        photonPath = createPhotonPath();
        electronPath = createElectronPath();

        imgCircuit_0 = new Image();
        imgCircuit_0.src = dirurl + "/" + "photoelectric_0.png";
        imgCircuit_0.onload = init;

        wf = workFunctions[currentMetal];
        let metals = new Object();
        for (let i = 0; i < workFunctions.length; i++) {
            metals[metalNames[i]] = workFunctions[i];
        }

        sliders = [];
        sliders.push(new Slider(spectrumLimit[0], spectrumLimit[1], spectrumLimit[2], spectrumLimit[3]));
        sliders[0].control(window, 'wavelength', 250, 750, 1);
        sliders.push(new Slider(intensityLimit[0], intensityLimit[1], intensityLimit[2], intensityLimit[3]));
        sliders[1].control(window, 'intensity', 0, 10, 0.5);
        sliders.push(new Slider(batteryLimit[0], batteryLimit[1], batteryLimit[2], batteryLimit[3]));
        sliders[2].control(window, 'voltage', -5, 5, 0.1);

        sliders.push(new Slider(90, 385, 90, 255));
        sliders[3].control(window, 'currentMetal', 0, workFunctions.length, 0.1);

        hammertime = new Hammer(canvas);
        hammertime.get('pan').set({direction: Hammer.DIRECTION_ALL, threshold: 0,});
        // hammertime.get('tap').set({  time: 0});
        hammertime.get('pinch').set({enable: true});
        hammertime.get('press').set({time: 0});
        hammertime.on('press', function (ev) {
            let mouseEvent = new MouseEvent("mousedown", {
                clientX: ev.center.x,
                clientY: ev.center.y
            });
            //console.log(ev);
            mousePressed(mouseEvent);
            //canvas.dispatchEvent(mouseEvent);
        });

        hammertime.on('panstart', function (ev) {
            let mouseEvent = new MouseEvent("mousedown", {
                clientX: ev.center.x,
                clientY: ev.center.y
            });
            //console.log(ev);
            mousePressed(mouseEvent);
            //canvas.dispatchEvent(mouseEvent);
        });
        hammertime.on('panend', function (ev) {
            let mouseEvent = new MouseEvent("mouseup", {
                clientX: ev.center.x,
                clientY: ev.center.y
            });
            // console.log(ev.type);
            // canvas.dispatchEvent(mouseEvent);
            mouseReleased(mouseEvent);
        });
        hammertime.on('panmove', function (ev) {

            let mouseEvent = new MouseEvent("mousemove", {
                clientX: ev.center.x,
                clientY: ev.center.y
            });
            mouseDragged(mouseEvent);
            // console.log(ev.type);
            // canvas.dispatchEvent(mouseEvent);
        });
        hammertime.on('pinchstart', function (ev) {
            intiScale = scale;

        });

        canvas.addEventListener("mousewheel", mouseWheelMoved);
        //can use pinch in pinchout separately
        hammertime.on('pinch', function (ev) {

            // console.log(ev.type+" scale="+ev.scale);
            let oldScale = scale;

            let x = ev.center.x / scale;
            let y = ev.center.y / scale;
            scale = intiScale * ev.scale;

            xOffset -= x * (scale - oldScale);
            yOffset -= y * (scale - oldScale);

            //xOffset=(xOffset+canvas.width/2-ev.center.x);//*scale;
            //yOffset=(yOffset+canvas.height/2-ev.center.y)//*scale;
            //paint();
        });
        canvas.onmousemove = MouseHovered;
        document.querySelector(".trigger_popup_fricc").onclick = function () {
            document.querySelector('.hover_bkgr_fricc').style.display = "block";
        };
        document.querySelector('.hover_bkgr_fricc').onclick = function () {
            document.querySelector('.hover_bkgr_fricc').style.display = "none";
        };
        document.querySelector('.popupCloseButton').onclick = function () {
            document.querySelector('.hover_bkgr_fricc').style.display = "none";
        };
        window.addEventListener('resize', function (ev) {
            return resize(ev);
        });

    }

    function update() {

    }

    function init() {
        rayFrustumPath = new Path2D();
        rayFrustumPath.moveTo(183, 180);
        rayFrustumPath.lineTo(0, 268);
        rayFrustumPath.lineTo(0, 570);
        rayFrustumPath.lineTo(230, 225);
        rayFrustumPath.closePath();
        rayFrustumGradient = ctx.createLinearGradient(215, 195, 38, 346)

        for (let i = 0; i < pulseMax; i++) {
            pulseType[i] = "none";
            pulseX[i] = -1;
            pulseY[i] = -1;
            pulseW[i] = 0; //wavelength
            pulseL[i] = -1; //life
            pulseV[i] = 0; //velocity
            pulseT[i] = 0; //pulse velocity direction angle
            pulseA[i] = 0 //accelration
        }
        //bgColor;
        pgPlot.clearRect(0, 0, pgPlotCanvas.width, pgPlotCanvas.height);
        pgPlot.fillStyle = bgColor;
        pgPlot.fillRect(0, 0, pgPlotCanvas.width, pgPlotCanvas.height);
        pgPlot.fillStyle = "rgba(255,255,255,0.3)";
        pgPlot.fillRect(plotX1, plotY1, plotX2 - plotX1, plotY2 - plotY1);
        pgPlot.lineWidth = 1;
        pgPlot.font = "16px Arial";
        let black = "white";
        let grey = "rgb(130,222,202)"
        for (let i = -5; i <= 5; i++) {
            let x = map(i, -5, 5, plotX1, plotX2);
            pgPlot.strokeStyle = grey;
            drawLine(x, plotY1, x, plotY2, pgPlot);
            pgPlot.strokeStyle = black;
            drawLine(x, plotY1 - 5, x, plotY1 + 5, pgPlot)
        }
        for (let i = 1; i <= 7; i++) {
            let y = map(i, 0, 7, plotY1, plotY2);
            pgPlot.strokeStyle = grey;
            drawLine(plotX1, y, plotX2, y, pgPlot);
            pgPlot.strokeStyle = black;
            drawLine(plotXc - 5, y, plotXc + 5, y, pgPlot)
        }
        pgPlot.fillStyle = "white";//rgb(80,80,120)"
        pgPlot.textAlign = "center";
        pgPlot.textBaseline = "hanging";
        for (let i = -5; i <= 5; i++) {
            let x = map(i, -5, 5, plotX1, plotX2);
            pgPlot.fillText(i, x, plotY1 + 10)
        }
        pgPlot.textAlign = "right";
        pgPlot.textBaseline = "top";
        for (let i = 1; i <= 7; i++) {
            let y = map(i, 0, 7, plotY1, plotY2);
            pgPlot.fillText(i, plotXc - 10, y)
        }
        pgPlot.strokeStyle = black;
        drawLine(plotXc, plotY1, plotXc, plotY2, pgPlot);
        drawLine(plotX1, plotY1, plotX2, plotY1, pgPlot);
        //pgPlot.noStroke();
        //pgPlot.fill(128);

        pgPlot.textAlign = "right";
        pgPlot.textBaseline = "top";
        //pgPlot.textAlign(RIGHT, TOP);
        pgPlot.fillText("Voltmeter (V)", plotX2, plotY1 + 35);
        pgPlot.textAlign = "center";
        pgPlot.textBaseline = "bottom";
        //pgPlot.textAlign(CENTER, BOTTOM);
        pgPlot.fillText("Ammeter (mA)", plotXc, plotY2 - 15);
        //pgPlot.fill(0);
        //pgPlot.noStroke()

        /*
        //draw spectrum
        for(let i=0;i<160;i++){
            pgPlot.strokeStyle=getLightColor(250+500/160*i);
            drawLine(i,0,i,24,pgPlot);
        }
        */
        if (timer) clearInterval(timer)
        timer = setInterval(draw, 1000 / 50);
        initialized = true;
    }


    function draw() {
        currentMetal = clamp(Math.floor(currentMetal), 0, workFunctions.length - 1);
        wf = workFunctions[currentMetal];
        //if (touches.length > 1) return;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
        ctx.font = "20px Arial";
        ctx.lineJoin = "round";
        pgPlot.textAlign = "center";
        pgPlot.textBaseline = "middle";

        if (!initialized) {
            ctx.fillText("Loading .....", canvas.width / 2, canvas.height / 2);
        }
        //strokeJoin(ROUND);
        /*
        if (wavelength != rangeU.value()) {
            wavelength = map(rangeU.value(), 250, 750, 750, 250);
            labelU.html(wavelength + "nm (" + round(299792.458 / wavelength) + "THz, " + round(1239.843066 / wavelength * 100) / 100.0 + "eV)")
        }
        if (intensity != rangeA.value()) {
            intensity = rangeA.value();
             if (language == 2) labelA.html("Irradiation intensity = " + intensity)
        }
        if (voltage10 != rangeB.value()) {
            voltage10 = rangeB.value();
            if (language == 2) labelB.html("Voltmeter = " + voltage10 / 10 + " V")
        }
        */

        hf = 1239.843066 / wavelength;
        ek = hf - wf + voltage;
        saturationVoltage = 3 - (hf - wf);
        let dt = (checkB ? 1 : 10);
        let electronLife = Math.sqrt(2 / (saturationVoltage + 0.1)) * tubeLength;
        current = 0;
        saturationCurrent = intensity / 2;
        if (hf >= wf) if (ek >= 0) {
            if (voltage <= saturationVoltage) current = cosineInterpolate2(0, saturationCurrent, ek / 3); else current = saturationCurrent;
        }
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(xOffset, yOffset);
        //ctx.scale(canvas.width / 1000,canvas.width / 1000);
        ctx.drawImage(imgCircuit_0, 0, 0);
        ctx.globalAlpha = intensity / 10;
        rayFrustumGradient.addColorStop(0, getLightColor(wavelength))
        rayFrustumGradient.addColorStop(1, "rgb(1,1,1,0)");//getLightColor(wavelength),0.1);
        ctx.fillStyle = rayFrustumGradient;
        ctx.fill(rayFrustumPath);
        ctx.fillStyle = "blue";
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "12px arial";
        ctx.lineWidth = 2.5;
        drawTorch();
        ctx.font = "16px arial";
        drawCathode();
        drawBattery();
        drawAmmeter();
        {
            for (let i = 0; i < pulseMax; i++) {
                if (pulseType[i] == "light") {
                    let x = (pulseX[i] + pulseL[i] * Math.cos(pulseT[i]));
                    let y = (pulseY[i] + pulseL[i] * Math.sin(pulseT[i]));
                    if (x > cathodeX + 15) {
                        pulseL[i] += pulseV[i] * (checkB ? 0.1 : 1)
                    } else {
                        pulseType[i] = "none";
                        if (hf > wf) {
                            // if (ek >= 0) {
                            pulseType[i] = "electron";
                            x = getCrossX(pulseX[i], pulseY[i], pulseX[i] - 1200, pulseY[i] + 1200, cathodeX, tubeCenterY - 300, cathodeX, tubeCenterY + 300);
                            y = getCrossY(pulseX[i], pulseY[i], pulseX[i] - 1200, pulseY[i] + 1200, cathodeX, tubeCenterY - 300, cathodeX, tubeCenterY + 300);
                            pulseX[i] = x;
                            pulseY[i] = y;
                            pulseL[i] = 0;
                            //assuming e/m=1 for electron
                            pulseV[i] = Math.sqrt(2 * (hf - wf)) * (0.3 + 0.7 * Math.random());// * (0.1+0.9*Math.random());//ek;
                            //pulseV[i] *= random(0.1, 1);
                            pulseT[i] = random(-0.1, 0.1);
                            pulseA[i] = voltage / (tubeLength - 10);
                            if (current < saturationCurrent && hf > wf) {
                                //some electrons loss energy in collision
                                if (Math.random() * saturationCurrent > current) {
                                    //pulseV[i] = 0;
                                    //pulseA[i] = 0;
                                    pulseL[i] = electronLife * 0.01;
                                }
                            }
                        }
                    }
                }
                if (pulseType[i] == "electron") {
                    pulseX[i] += pulseV[i] * Math.cos(pulseT[i]) * dt;
                    pulseY[i] += pulseV[i] * Math.sin(pulseT[i]) * dt;
                    pulseV[i] += dt * pulseA[i];
                    if (pulseL[i] != 0) {
                        pulseL[i] += dt * 2;
                    }

                    if (pulseL[i] > electronLife || pulseX[i] < cathodeX || pulseX[i] > anodeX) pulseType[i] = "none"
                }
            }
            intensitySum += intensity * (checkB ? 0.1 : 1);
            if (intensitySum >= 10) {
                intensitySum -= 10;
                for (let i = 0; i < pulseMax; i++) {
                    if (pulseType[i] == "none") {
                        pulseType[i] = "light";
                        pulseX[i] = startX + random(-20, 20);
                        pulseY[i] = startY + random(-20, 20);
                        pulseL[i] = 0;
                        pulseV[i] = 30;
                        pulseT[i] = 3 * Math.PI / 4;
                        pulseW[i] = wavelength;
                        break
                    }
                }
            }
        }
        ctx.lineWidth = 2;
        for (let i = 0; i < pulseMax; i++) {
            //ctx.textAlign="right";
            //ctx.textBaseline="middle";//RIGHT, CENTER);
            if (pulseType[i] == "light") {
                ctx.strokeStyle = "white";//getLightColor(pulseW[i]);
                drawPhoton2(pulseX[i], pulseY[i], pulseL[i], pulseW[i], pulseT[i])
            }
            if (pulseType[i] == "electron") {
                //noStroke();
                ctx.fillStyle = electronColor;//"rgba(0, 0, 255,"+map(pulseL[i], 0, electronLife, 255, 0)/255+")";
                ctx.globalAlpha = map(pulseL[i], 0, electronLife, 255, 0) / 255;
                //fillOval(pulseX[i], pulseY[i], 10, 10)
                drawElectron(pulseX[i], pulseY[i]);
                ctx.globalAlpha = 1;

            }
        }

        ctx.fillStyle = fgColor;//fill(0);
        //noStroke();

        //ctx.fillText("hf = "+hf.toFixed(2)  + " eV", 575, 20);
        //ctx.fillText("wf = "+wf.toFixed(2)  + " eV", 675, 20);
        //ctx.fillText("KE = "+(hf-wf).toFixed(2)  + " eV", 775, 20);

        let xx = map(voltage, -5, 5, plotX1, plotX2);
        let yy = map(current, 0, 7, plotY1, plotY2);
        pgPlot.fillStyle = getLightColor(wavelength);
        pgPlot.beginPath();
        pgPlot.arc(xx, yy, 5 / 2, 0, 2 * Math.PI, false);
        pgPlot.fill();
        ctx.drawImage(pgPlotCanvas, 680, 189);
        //noStroke();
        ctx.fillStyle = getLightColor(wavelength);
        if (frameCount % 4 < 2) fillOval(680 + xx, 189 + yy, 10, 10);
        ctx.restore();//pop()

        frameCount++;
    }

    function getMousePos(event) {
        //let rect = canvas.getBoundingClientRect();
        return [-xOffset + event.clientX / scale, -yOffset + event.clientY / scale];
    }

    function MouseHovered(me) {
        let m = getMousePos(me);
        for (let i = 0; i < sliders.length; i++) {
            if (sliders[i].contains(m[0], m[1])) {
                document.body.style.cursor = "pointer";
                return;
            }
        }
        document.body.style.cursor = "default";

    }

    function mousePressed(me) {
        let m = getMousePos(me);
        //convert mouse pos in world coordinates taking translation and scale in account
        mx = m[0];
        my = m[1];
        for (let i = 0; i < sliders.length; i++) {
            document.body.style.cursor = "pointer";
            sliders[i].active = (sliders[i].dragStart(mx, my));
        }
    }

    function mouseReleased(me) {
        for (let i = 0; i < sliders.length; i++) {
            sliders[i].active = false;
        }
    }


    function mouseDragged(me) {
        let m = getMousePos(me);
        //console.log(m);
        let dx, dy;
        dx = (m[0] - mx);///scale;
        dy = (m[1] - my);///scale;
        mx = m[0];
        my = m[1];
        for (let i = 0; i < sliders.length; i++) {
            if (sliders[i].active) {
                document.body.style.cursor = "pointer";
                if (sliders[i].active) sliders[i].drag(dx, dy);
                return;
            }

        }
        xOffset += dx;
        yOffset += dy;
        mx -= dx;
        my -= dy;
    }

    function mouseWheelMoved(me) {
        //console.log(e.wheelDelta);
        let scroll = me.wheelDelta > 0 ? 1 : -1;
        if (scroll > 0) {
            scale *= 1.01;
        } else {
            scale *= 0.99;
        }
    }

    function createPhotonPath() {
        let nano = 500;
        let path = new Path2D();
        //  path.beginPath();
        //  let width = 3 * (this.frequency / 1500000000000000);
        let width = 40;
        let height = 9;

        let N = 60;
        path.moveTo(-N / 2, 0);
        for (let i = -N / 2; i < N / 2; i += 1) {
            let y = height * Math.cos(Math.PI * i / N) * Math.sin(15 * Math.PI * i / N);
            path.lineTo(i, y);

        }

        return path;
    }

    function createElectronPath() {
        let path = new Path2D();
        // path.beginPath();
        path.arc(0, 0, 5, 0, 2 * Math.PI, false);
        return path;
    }

    function drawCathode() {
        ctx.save();
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.translate(90, 398);
        //ctx.rotate(Math.PI/2);
        ctx.fillText(metalNames[currentMetal], 0, 0);

        ctx.restore();
        let x = 80;
        let y = map(wf, 1.27, 4.28, 380, 258);
        ctx.strokeStyle = fgColor;
        drawLine(x, y, x + 13, y);
    }

    function drawBattery() {
        ctx.fillStyle = "red";
        if (voltage > 0) {
            ctx.fillStyle = "red";
            ctx.fillRect(batteryTerminals[0], batteryTerminals[1], batteryTerminalSize, batteryTerminalSize);
            ctx.fillText("+", batteryTerminals[0] + batteryTerminalSize / 2, batteryTerminals[1] + batteryTerminalSize * 2);
            ctx.fillStyle = "#201818";
            ctx.fillRect(batteryTerminals[2], batteryTerminals[3], batteryTerminalSize, batteryTerminalSize);
            ctx.fillText("-", batteryTerminals[2] + batteryTerminalSize / 2, batteryTerminals[3] + batteryTerminalSize * 2);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(batteryTerminals[2], batteryTerminals[3], batteryTerminalSize, batteryTerminalSize);
            ctx.fillText("+", batteryTerminals[2] + batteryTerminalSize / 2, batteryTerminals[3] + batteryTerminalSize * 2);
            ctx.fillStyle = "#201818";
            ctx.fillRect(batteryTerminals[0], batteryTerminals[1], batteryTerminalSize, batteryTerminalSize);
            ctx.fillText("-", batteryTerminals[0] + batteryTerminalSize / 2, batteryTerminals[1] + batteryTerminalSize * 2);
        }
        let x = map(voltage, -5, 5, batteryLimit[0], batteryLimit[2]);
        let y = map(voltage, -5, 5, batteryLimit[1], batteryLimit[3]);
        ctx.strokeStyle = fgColor;
        drawLine(x, y - 10, x, y + 10);
        ctx.fillStyle = fgColor;
        ctx.fillText(Math.round(voltage * 100) / 100 + "V", x, y + 25);

        ctx.fillStyle = fgColor;
        ctx.globalAlpha = Math.abs(voltage) / 5;
        ctx.lineWidth = 1.5;
        for (let i = -2; i < 3; i++) {
            let x = cathodeX + 10;
            let y = tubeCenterY + 20 * i;
            drawLineWithArrows(x, y, anodeX - 10, y, 5, 5, voltage > 0, voltage < 0);
        }
        ctx.globalAlpha = 1;
    }

    function drawTorch() {
        let x = map(wavelength, 250, 750, spectrumLimit[0], spectrumLimit[2]);
        let y = map(wavelength, 250, 750, spectrumLimit[1], spectrumLimit[3]);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 4);

        ctx.fillStyle = ctx.strokeStyle = fgColor;
        ctx.lineWidth = 2.5;
        drawLine(0, -9, 0, 10);
        ctx.fillText(wavelength + 'nm', 0, -18);
        ctx.fillText(hf.toFixed(2) + 'eV', 0, 19);
        ctx.restore();
        ctx.strokeStyle = "grey";
        for (let i = 2 * intensity; i < 20; i++) {
            x = map(i, 0, 20, intensityLimit[0], intensityLimit[2]);
            y = map(i, 0, 20, intensityLimit[1], intensityLimit[3]);
            drawLine(x - 5, y + 5, x + 5, y - 5);
        }

        ctx.strokeStyle = "orange";
        for (let i = 0; i < 2 * intensity; i++) {
            x = map(i, 0, 20, intensityLimit[0], intensityLimit[2]);
            y = map(i, 0, 20, intensityLimit[1], intensityLimit[3]);
            drawLine(x - 5, y + 5, x + 5, y - 5);
        }

        // drawArrow_head(x,y,x-5,y+5,8);
        //drawLineWithArrows(x,y,x+15,y+15,5,5,true,false);

    }

    function drawAmmeter() {
        let th = Math.PI * current / 5;
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(ammeter[0], ammeter[1]);
        ctx.lineTo(ammeter[0] - ammeterNeedle * Math.cos(th), ammeter[1] - ammeterNeedle * Math.sin(th));
        ctx.stroke();
        ctx.fillStyle = "red";
        fillOval(ammeter[0], ammeter[1], 4, 4);
        ctx.fillStyle = fgColor;
        ctx.fillText(Math.round(current * 100) / 100 + "mA", ammeter[0], batteryLimit[3] + 25);


    }

    function drawPhoton2(x, y, cx, nano, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t);
        ctx.translate(cx, 0);

        ctx.scale(nano / 500, 1);
        //
        ctx.lineWidth = 1;
        ctx.stroke(photonPath);


        {
            //noFill();
            ctx.beginPath();
            let i = cx - 20;
            let py = 10 * Math.pow(Math.cos(map(i, cx - 25, cx + 25, -Math.PI / 3, Math.PI / 3)), 2) * Math.sin(i * 200.0 / nano);
            ctx.moveTo(cx - 20, py);
            for (i = cx - 20; i < cx + 20; i++) {
                py = 10 * Math.pow(Math.cos(map(i, cx - 25, cx + 25, -Math.PI / 3, Math.PI / 3)), 2) * Math.sin(i * 200.0 / nano);
                ctx.lineTo(i, py)
            }
            //ctx.stroke();//endShape(OPEN)
        }

        ctx.restore();
    }

    function drawElectron(x, y, cx, nano, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fill(electronPath);
        ctx.strokeStyle = "white";
        drawLine(-4, 0, 4, 0);
        //ctx.stroke(electronPath);
        ctx.restore();
    }


    function createOffscreenCanvas(w, h) {
        let offScreenCanvas = document.createElement('canvas');
        offScreenCanvas.width = w;
        offScreenCanvas.height = h;
        //context.fillStyle = 'orange'; //set fill color
        //context.fillRect(10, 10, 200, 200);
        return offScreenCanvas; //return canvas element
    }

    function map(n, start1, stop1, start2, stop2) {
        if (n < start1) n = start1;
        if (n > stop1) n = stop1;
        return (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    }

    function constrain(n, low, high) {
        return Math.max(Math.min(n, high), low);
    }

    function drawLine(x1, y1, x2, y2, context) {
        if (context == undefined) context = ctx;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
    }

// x0,y0: the line's starting point
// x1,y1: the line's ending point
// width: the distance the arrowhead perpendicularly extends away from the line
// height: the distance the arrowhead extends backward from the endpoint
// arrowStart: true/false directing to draw arrowhead at the line's starting point
// arrowEnd: true/false directing to draw arrowhead at the line's ending point
    function drawLineWithArrows(x0, y0, x1, y1, aWidth, aLength, arrowStart, arrowEnd) {
        let dx = x1 - x0;
        let dy = y1 - y0;
        let angle = Math.atan2(dy, dx);
        let length = Math.sqrt(dx * dx + dy * dy);
        //
        ctx.save();
        ctx.translate(x0, y0);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        if (arrowStart) {
            ctx.moveTo(aLength, -aWidth);
            ctx.lineTo(0, 0);
            ctx.lineTo(aLength, aWidth);
        }
        if (arrowEnd) {
            ctx.moveTo(length - aLength, -aWidth);
            ctx.lineTo(length, 0);
            ctx.lineTo(length - aLength, aWidth);
        }
        //
        ctx.stroke();
        ctx.restore();
    }

    function drawArrow_head(x, y, cx, cy, head) {
        drawLine(x, y, x + cx, y + cy);

        let leng = Math.sqrt(cx * cx + cy * cy);
        let bolt = Math.min(leng / 2.0, head);
        let x1 = 0.968912422 * cx * bolt / leng - 0.247403959 * cy * bolt / leng;
        let y1 = 0.247403959 * cx * bolt / leng + 0.968912422 * cy * bolt / leng;
        let x2 = 0.968912422 * cx * bolt / leng + 0.247403959 * cy * bolt / leng;
        let y2 = -0.247403959 * cx * bolt / leng + 0.968912422 * cy * bolt / leng;
        ctx.beginPath();
        ctx.moveTo(x + cx - x1, y + cy - y1);
        ctx.lineTo(x + cx, y + cy);
        ctx.lineTo(x + cx - x2, y + cy - y2);
        ctx.stroke();
    }

    function fillOval(x, y, w, h, stroke) {
        ctx.beginPath();
        ctx.arc(x, y, w / 2, 0, 2 * Math.PI, false);
        ctx.fill();
        if (stroke) ctx.stroke();
    }

    function outString(x, y, s, x_align, y_align) {
        let fm = ctx.measureText(s);
        let h = 10;//fm.height not supported in browsers
        switch (y_align) {
            case 0:
                y += h;
                break;
            case 1:
                y += h / 2;
                break;
            case 2:
                break;
        }
        switch (x_align) {
            case 0:
                ctx.fillText(s, x + 3, y);
                break;
            case 1:
                ctx.fillText(s, x - fm.width / 2, y);
                break;
            case 2:
                ctx.fillText(s, x - fm.width / 2, y);
                break;
        }
    }

    function getCrossX(x1, y1, x2, y2, x3, y3, x4, y4) {
        let t;
        let s;
        let under = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (under == 0) return 0;

        let _t = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
        let _s = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

        t = _t / under;
        s = _s / under;
        //if(t < 0.0 || t > 1.0 || s < 0.0 || s > 1.0) return 0;
        //if(_t == 0 && _s == 0) return 0;

        return (x1 + t * (x2 - x1));
    }

    function getCrossY(x1, y1, x2, y2, x3, y3, x4, y4) {
        let t;
        let s;
        let under = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (under == 0) return 0;

        let _t = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
        let _s = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

        t = _t / under;
        s = _s / under;
        //if(t < 0.0 || t > 1.0 || s < 0.0 || s > 1.0) return 0;
        //if(_t == 0 && _s == 0) return 0;

        return (y1 + t * (y2 - y1));
    }

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function mod(x, y) {
        //  ì¼ë‹¨, ì–‘ìˆ˜ë¡œ ë§Œë“ ë‹¤.
        if (x < 0) x += y * (ceil(abs(x) / y) + 1);
        let c = floor(x / y);
        return x - y * c;
    }

    /**
     *
     * @param wavelengthNano in nanometer
     * @param alpha optional opacity, is 1 if not set
     * @returns {string} css color
     */
    function getLightColor(wavelengthNano, alpha) {
        let wavelength = wavelengthNano;
        if (wavelengthNano < 380) {
            wavelength = 380;
        }
        let Gamma = 0.80,
            IntensityMax = 255,
            factor, red, green, blue;
        if ((wavelength >= 380) && (wavelength < 440)) {
            red = -(wavelength - 440) / (440 - 380);
            green = 0.0;
            blue = 1.0;
        } else if ((wavelength >= 440) && (wavelength < 490)) {
            red = 0.0;
            green = (wavelength - 440) / (490 - 440);
            blue = 1.0;
        } else if ((wavelength >= 490) && (wavelength < 510)) {
            red = 0.0;
            green = 1.0;
            blue = -(wavelength - 510) / (510 - 490);
        } else if ((wavelength >= 510) && (wavelength < 580)) {
            red = (wavelength - 510) / (580 - 510);
            green = 1.0;
            blue = 0.0;
        } else if ((wavelength >= 580) && (wavelength < 645)) {
            red = 1.0;
            green = -(wavelength - 645) / (645 - 580);
            blue = 0.0;
        } else if ((wavelength >= 645) && (wavelength < 781)) {
            red = 1.0;
            green = 0.0;
            blue = 0.0;
        } else {
            red = 0.0;
            green = 0.0;
            blue = 0.0;
        }
        ;
        // Let the intensity fall off near the vision limits
        if ((wavelength >= 380) && (wavelength < 420)) {
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        } else if ((wavelength >= 420) && (wavelength < 701)) {
            factor = 1.0;
        } else if ((wavelength >= 701) && (wavelength < 781)) {
            factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
        } else {
            factor = 0.0;
        }
        ;
        if (red !== 0) {
            red = Math.round(IntensityMax * Math.pow(red * factor, Gamma));
        }
        if (green !== 0) {
            green = Math.round(IntensityMax * Math.pow(green * factor, Gamma));
        }
        if (blue !== 0) {
            blue = Math.round(IntensityMax * Math.pow(blue * factor, Gamma));
        }
        if (wavelengthNano < 380) {
            red = cosineInterpolate(red, 0, (wavelengthNano - 380) / 180);
            green = cosineInterpolate(green, 0, (wavelengthNano - 380) / 180);
            blue = cosineInterpolate(blue, 0, (wavelengthNano - 380) / 180);
        }
        if (alpha == undefined) alpha = 1;
        return "rgb(" + red + "," + green + "," + blue + "," + alpha + ")";
    }

    function getRedColor(nano)        // ë³€í˜•ë˜ì—ˆìŒ
    {
        // ë¹¨ê°•
        if (400 <= nano) if (nano < 420)
            return cosineInterpolate(64, 64 + 20, map(nano, 400, 420, 0, 1));
        if (420 <= nano) if (nano < 510)
            return cosineInterpolate(64 + 20, 64 - 64, map(nano, 420, 510, 0, 1));
        if (510 <= nano) if (nano < 580)
            return cosineInterpolate(64 - 64, 64 + 191, map(nano, 510, 580, 0, 1));
        if (580 <= nano) if (nano < 700)
            return cosineInterpolate(64 + 191, 64, map(nano, 580, 700, 0, 1));
        return 64;
    }

    function getGreenColor(nano)        // ë³€í˜•ë˜ì—ˆìŒ
    {
        // ë…¹ìƒ‰
        if (400 <= nano) if (nano < 440)
            return cosineInterpolate(64, 64 - 20, map(nano, 400, 440, 0, 1));
        if (440 <= nano) if (nano < 550)
            return cosineInterpolate(64 - 20, 64 + 128, map(nano, 440, 550, 0, 1));
        if (550 <= nano) if (nano < 640)
            return cosineInterpolate(64 + 128, 64 - 10, map(nano, 550, 640, 0, 1));
        if (640 <= nano) if (nano < 700)
            return cosineInterpolate(64 - 10, 64, map(nano, 640, 700, 0, 1));
        return 64;
    }

    function getBlueColor(nano)        // ë³€í˜•ë˜ì—ˆìŒ
    {
        // íŒŒëž‘
        if (400 <= nano) if (nano < 450)
            return cosineInterpolate(64, 64 + 148, map(nano, 400, 450, 0, 1));
        if (450 <= nano) if (nano < 550)
            return cosineInterpolate(64 + 148, 64 - 12, map(nano, 450, 550, 0, 1));
        if (550 <= nano) if (nano < 650)
            return cosineInterpolate(64 - 12, 64, map(nano, 550, 650, 0, 1));
        if (650 <= nano) if (nano < 700)
            return cosineInterpolate(64, 64, map(nano, 650, 700, 0, 1));
        return 64;
    }

    function lerp(start, stop, amt) {
        return amt * (stop - start) + start;
    }

    function cosineInterpolate(a, b, x) {
        let ft = x * Math.PI;
        let f = (1 - Math.cos(ft)) * 0.5;
        return a * (1 - f) + b * f;
    }

    function cosineInterpolate2(a, b, x) {
        let t = map(x, 0, 1, -1, Math.PI / 2);
        t = map(Math.sin(t), Math.sin(-1), 1, 0, 1);
        return lerp(a, b, t)
    }

    /**
     * Distance of point (x,y) from line joining (x1,y1) and (x2,y2)
     * @param x
     * @param y
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @returns {number}
     */
    function distance(x, y, x1, y1, x2, y2) {

        let A = x - x1;
        let B = y - y1;
        let C = x2 - x1;
        let D = y2 - y1;

        let dot = A * C + B * D;
        let len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) //in case of 0 length line
            param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        let dx = x - xx;
        let dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function angle2Lines(dx1, dy1, dx2, dy2) {
        Math.cos(dx1 * dx2 + dy1 * dy2 / (dx1 * dx1 + dx2 * dx2));
    }

    function clamp(v, min, max) {
        if (v < min) return min;
        if (v > max) return max;
        return v;
    }
    return initialize;
}