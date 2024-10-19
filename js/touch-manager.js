/* Class for managing touch input. */
class Touches {
    _touches;
    lockToDouble;
    constructor() {
        this.lockToDouble = false;
        this._touches = [];
    }
    setXY(index, x, y) {
        if (index < 0)
            return;
        while (this._touches.length <= index)
            this._touches.push([]);
        while (this._touches[index].length > 0)
            this._touches[index].pop();
        this._touches[index].push([x, y]);
    }
    isEmpty(index) {
        if (index < 0)
            return true;
        if (this._touches.length <= index)
            return true;
        return this._touches[index].length === 0;
    }
    getXY(index) {
        console.log(this._touches[index]);
        let xy = this._touches[index][0]; 
        return [xy[0], xy[1]];
    }
    resetAt(index) {
        this._touches[index] = [];
    }
    reset() {
        this.lockToDouble = false;
        this._touches = [];
    }
}

export default Touches;