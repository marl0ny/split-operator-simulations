
function determinant2x2(m00, m01, m10, m11) {
    return m00*m11 - m01*m10;
}

export function determinant3x3(m) {
    return (
        m[0][0]*determinant2x2(m[1][1], m[1][2], m[2][1], m[2][2]) 
         - m[0][1]*determinant2x2(m[1][0], m[1][2], m[2][0], m[2][2])
         + m[0][2]*determinant2x2(m[1][0], m[1][1], m[2][0], m[2][1])
    );
}

function sortRows3x3(array) {
    let non_zero_start_rows = [], zero_start_rows = [];
    for (let i = 0; i < 3; i++) {
        if (array[i][0] == 0.0)
            zero_start_rows.push(array[i]);
        else
            non_zero_start_rows.push(array[i]);
    }
    let single_zero_start_rows = [];
    let double_zero_start_rows = [];
    for (let i = 0; i < zero_start_rows.length; i++) {
        if (zero_start_rows[i][1] == 0.0)
            double_zero_start_rows.push(zero_start_rows[i]);
        else
            single_zero_start_rows.push(zero_start_rows[i]);
    }
    let array2 = non_zero_start_rows.concat(
        single_zero_start_rows).concat(double_zero_start_rows);
    return array2;
}

export function solve3x3Matrix(matrix, b) {
    let array = [];
    for (let i = 0; i < matrix.length; i++)
        array.push([].concat(matrix[i]).concat(b[i]));
    let array2 = sortRows3x3(array);
    // console.log(array2);
    if (array2[2][0] !== 0.0) {
        let row1Val = array2[2][0]/array2[0][0];
        for (let i = 0; i < array[0].length; i++) {
            array2[2][i] -= row1Val*array2[0][i];
        }
    }
    if (array2[1][0] !== 0.0) {
        let row2Val = array2[1][0]/array2[0][0];
        for (let i = 0; i < array[0].length; i++) {
            array2[1][i] -= row2Val*array2[0][i];
        }
    }
    if (array2[2][1] !== 0.0) {
        let row2Val = array2[2][1]/array2[1][1];
        for (let i = 0; i < array[0].length; i++) {
            array2[2][i] -= row2Val*array2[1][i];
        }
    }
    let r = array2[2][3]/array2[2][2];
    let t = (array2[1][3] - array2[1][2]*r)/array2[1][1];
    let s = (array2[0][3] - (array2[0][1]*t + array2[0][2]*r))/array2[0][0];
    return [s, t, r];
}

export function testMatrix3x3() {
    let m1 = [[1, 2, 3], [0, 1, 3], [0, 0, 1]];
    console.log(solve3x3Matrix(m1, [1, 2, 1]));
    // [ 0., -1.,  1.]
    // console.log(sortRows3x3([[0, 0, 3, 1], [0, 1, 1, 1], [4, 1, 2, 3]]));
    let m2 = [[0, 0, 3], [0, 1, 1], [4, 1, 2]];
    console.log(solve3x3Matrix(m2, [1, 1, 3]));
    // let m2 = [[4, 1, 2], [0, 1, 1], [0, 0, 3]];
    // console.log(solve3x3Matrix(m2, [3, 1, 1]));
    // [0.41666667, 0.66666667, 0.33333333]
    let m3 = [[1, -1, 0.5], [2.0, 0.0, 3.0], [1.0, -1.0, 0.0]];
    console.log(solve3x3Matrix(m3, [1, -1, 1]));
    // [-0.5, -1.5, -0. ]
    let m4 = [[2.0, 1.0, 0.0], [3.0, 0.0, 1.0], [0.0, -2.0, 7.0]];
    console.log(solve3x3Matrix(m4, [10, 11, -9]));
    // [ 3.88235294,  2.23529412, -0.64705882]
    let m5 = [[1.0, 1.0, -1.0], [-1.0, 0.0, 1.0], [2.0, 0.0, 0.0]];
    console.log(solve3x3Matrix(m5, [1, 1, 1]));
    // [0.5, 2. , 1.5]
    console.log(solve3x3Matrix(m5, [0.0, 0.0, 0.0]));
    // [0, 0, 0]

}
