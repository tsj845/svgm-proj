const svg = document.getElementById("out");
const sty = document.createElement("style");
document.head.appendChild(sty);

const data = {
    "meta":{
        // add meta props here
    },
    "css":[
        [".lime", "fill:#00ff00;"],
    ],
    "frames":[
        [0, {type:"rect", props:{"x":2,"y":2,"width":996,"height":996,"fill":"transparent","stroke":"black","stroke-width":2}}],
        [3, {type:"circ", props:{"cx":50,"cy":50,"r":50}, clname:"lime", "name":"c1"}],
        // [0, {type:"circle", props:{"cx":50,"cy":50,"r":50,"fill":"#00ff00"}, "name":"c1"}],
        [2, {to:1, paths:{"props,transform,translate":[[0, 0], [10, 10], 10]}}, {"name":"c1", props:{transform:{"rel":false,"translate":[null,null]}}}],
    ],
};

function getTransform (element, id) {
    id = {0:"translate", 1:"rotate", 2:"scale", 3:"skewX", 4:"skewY"}[id];
    const ostr = element.attributes["transform"].textContent;
    let str = ostr.slice(ostr.indexOf(id)+id.length+1);
    str = str.slice(0, str.indexOf(")"));
    return str.split(" ");
}
function editTransform (element, id, value) {
    id = {0:"translate", 1:"rotate", 2:"scale", 3:"skewX", 4:"skewY"}[id];
    const ostr = element.attributes["transform"].textContent;
    let ind = ostr.indexOf(id)+id.length+1;
    let str = ostr.slice(0, ind);
    str += value;
    const nind = ostr.slice(ind+1).indexOf(")")+ind+1;
    const end = ostr.slice(nind);
    str += end;
    element.attributes["transform"].textContent = str;
}

class SVGM {
    constructor (data, out, sty) {
        this.uri = "http://www.w3.org/2000/svg";
        this.out = out;
        this.sty = sty;
        this.data = data;
        this.shapes = {};
        this.frame = 0;
        this.kfd = 0;
        this.framedelay = 42;
        this.width = 1000;
        this.height = 1000;
        this.play();
    }
    updatesvgdim () {
        this.out.setAttribute("width", this.width);
        this.out.setAttribute("height", this.height);
        this.out.setAttribute("viewBox", "0 0 " + this.width + " " + this.height);
    }
    parsekeyframe (frame) {
        this.out.replaceChildren();
        this.parseaddframe(frame);
    }
    parseaddframe (frame) {
        frame = frame.slice(1);
        const conv = {"circ":0, "rect":1, "plin":2, "poly":3, "oval":4, "grop":5, "embd":6};
        for (let i = 0; i < frame.length; i ++) {
            const def = frame[i];
            let shape = null;
            switch (def.type in conv ? conv[def.type] : undefined) {
                case 0:
                    shape = document.createElementNS(this.uri, "circle");
                    break;
                case 1:
                    shape = document.createElementNS(this.uri, "rect");
                    break;
                case 2:
                    shape = document.createElementNS(this.uri, "polyline");
                    break;
                case 3:
                    shape = document.createElementNS(this.uri, "polygon");
                    break;
                case 4:
                    shape = document.createElementNS(this.uri, "ellipse");
                    break;
                case 5:
                    shape = document.createElementNS(this.uri, "g");
                    break;
                case 6:
                    shape = document.createElementNS(this.uri, "a");
                default:
                    throw "unknown shape";
            }
            if ("name" in def) {
                this.shapes[def.name] = shape;
            }
            if ("clname" in def) {
                shape.setAttribute("class", def.clname);
            }
            const props = def.props;
            for (const key in props) {
                shape.setAttribute(key, props[key]);
            }
            if ("cattrs" in def) {
                shape.style.cssText = def.cattrs;
            }
            this.out.append(shape);
        }
    }
    transformshape (shape, prop) {
        if (shape.getAttribute("transform") === null) {
            shape.setAttribute("transform", "translate(0 0) rotate(0) scale(1 1) skewX(1) skewY(1)");
        }
        const rel = "rel" in prop ? prop["rel"] : false;
        for (const p in prop) {
            if (p === "rel") {
                continue;
            }
            let dat = prop[p];
            switch (p) {
                case "translate":
                    if (rel) {
                        let odat = getTransform(shape, 0);
                        dat[0] = dat[0] + Number(odat[0]);
                        dat[1] = dat[1] + Number(odat[1]);
                    }
                    editTransform(shape, 0, dat.join(" "));
                    break;
                default:
                    break;
            }
        }
    }
    css (shape, cssattrs) {
        for (let i = 0; i < cssattrs.length; i ++) {
            const d = cssattrs[i].split(":");
            shape.style[d[0]] = d[1].slice(0, d[1].length-1);
        }
    }
    parseupframe (frame) {
        console.log(frame);
        frame = frame.slice(1);
        for (let i = 0; i < frame.length; i ++) {
            const inst = frame[i];
            const shape = this.shapes[inst.name];
            for (const key in inst.props) {
                const prop = inst.props[key];
                switch (key) {
                    case "transform":
                        this.transformshape(shape, prop);
                        break;
                    default:
                        break;
                }
            }
        }
    }
    parsehead () {
        const sty = this.sty.sheet;
        // console.log(sty);
        for (let i = sty.rules.length-1; i >= 0; i --) {
            sty.deleteRule(i);
        }
        let head = this.data["css"];
        for (let i = 0; i < head.length; i ++) {
            const style = head[i];
            sty.addRule(style[0], style[1]);
        }
    }
    parsemeta () {
        const search = {"kfd":42, "mfd":0, "width":1000, "height":1000};
        const keyconv = {"mfd":"framedelay"};
        for (const key in search) {
            let value = search[key];
            if (key in this.data.meta) {
                value = this.data.meta[key];
            }
            const fkey = key in keyconv ? keyconv[key] : key;
            this[fkey] = value;
            console.log(this[fkey], fkey);
        }
        this.updatesvgdim();
    }
    doframe () {
        const frame = this.data["frames"][this.frame];
        const id = frame[0];
        const nolengthframes = [0, 3];
        switch (id) {
            case 0:
                this.parsekeyframe(frame);
                break;
            case 1:
                this.parseupframe(frame);
                break;
            case 3:
                this.parseaddframe(frame);
            default:
                break;
        }
        this.frame += 1;
        if (this.frame >= this.data["frames"].length) {
            this.frame = 0;
            return;
        }
        setTimeout(()=>{this.doframe()}, (nolengthframes.indexOf(id)<0?this.kfd:this.framedelay));
    }
    gencomp (dat, iter) {
        let fin = [];
        for (let i = 0; i < dat.length-1; i ++) {
            fin.push((dat[1][i]-dat[0][i])/dat[2]*iter);
        }
        return fin;
    }
    _manbase (base, key, comp) {
        if (typeof key === "string") {
            key = key.split(",");
        }
        switch (key.length) {
            case 1:
                base[key[0]] = comp;
                break;
            case 2:
                base[key[0]][key[1]] = comp;
                break;
            case 3:
                base[key[0]][key[1]][key[2]] = comp;
                break;
            case 4:
                base[key[0]][key[1]][key[2]][key[3]] = comp;
                break;
            default:
                throw "invalid key length";
        }
        return base;
    }
    arrcopy (a) {
        let f = [];
        for (let i = 0; i < a.length; i ++) {
            f.push(a[i]);
        }
        return f;
    }
    copybase (b) {
        if (Array.isArray(b)) {
            return this.arrcopy(b);
        }
        for (const key in b) {
            if (["number", "string", "boolean"].indexOf(typeof b[key]) === -1) {
                b[key] = this.copybase(b[key]);
            }
        }
        return Object.assign({}, b);
    }
    getExpand (f) {
        let fin = [];
        const data = f[1];
        const id = data.to;
        for (const key in data.paths) {
            for (let i = 0; i < data.paths[key][2]+1; i ++) {
                let base = this.copybase(f[2]);
                // console.log(base.props.transform.translate);
                let comp = this.gencomp(data.paths[key], i);
                base = this._manbase(base, key, comp);
                if (Object.is(base, f[2])) {
                    throw "same";
                }
                fin.push([id, base]);
            }
        }
        // console.log(fin);
        return fin;
    }
    expandFrames () {
        let frames = this.data["frames"];
        let i = 0;
        while (i < frames.length) {
            const f = frames[i];
            if (f[0] === 2) {
                frames = frames.slice(0, i).concat(this.getExpand(f)).concat(frames.slice(i+1));
            }
            i ++;
        }
        // console.log(frames);
        this.data["frames"] = frames;
    }
    play () {
        this.out.replaceChildren();
        this.parsehead();
        this.parsemeta();
        this.expandFrames();
        this.doframe();
    }
}

const runner = new SVGM(data, svg, sty);