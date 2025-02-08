#include "gl_wrappers.hpp"

#ifndef _MATRIX_3x3_
#define _MATRIX_3x3_

struct Matrix3x3 {
    union {
        float ind[3][3];
        Vec3 rows[3];
    };
    float& operator()(int i, int j) {
        return ind[i][j];
    }
    float operator()(int i, int j) const {
        return ind[i][j];
    }
    Vec3 operator[](int i) const {
        return rows[i];
    }
    Matrix3x3 transpose() const {
        return {.rows={
            {.ind={ind[0][0], ind[1][0], ind[2][0]}},
            {.ind={ind[0][1], ind[1][1], ind[2][1]}},
            {.ind={ind[0][2], ind[1][2], ind[2][2]}},
        }};
    }
    std::vector<float *> get_row_pointers() {
        return {&rows[0][0], &rows[1][0], &rows[2][0]};
    }
};


static float determinant2x2(float m00, float m01, float m10, float m11) {
    return m00*m11 - m01*m10;
}

static float determinant3x3(const Matrix3x3 &m) {
    return m[0][0]*determinant2x2(m[1][1], m[1][2], m[2][1], m[2][2]) 
         - m[0][1]*determinant2x2(m[1][0], m[1][2], m[2][0], m[2][2])
         + m[0][2]*determinant2x2(m[1][0], m[1][1], m[2][0], m[2][1]);
}

void sort_rows_by_abs_vals(float **matrix, size_t column_index, size_t n_columns) {
    for (size_t row_index = 0; row_index < n_columns; row_index++) {
        float val = matrix[row_index][column_index];
        for (size_t row_index2 = row_index+1; row_index2 < n_columns; row_index2++) {
            if (abs(val) < abs(matrix[row_index2][column_index])) {
                val = matrix[row_index2][column_index];
                std::swap(matrix[row_index], matrix[row_index2]);
            }
        }
    }
}

// static void sort_rows(std::vector<Vec3 *>rows, int column_sort_index) {
//     std::vector<Vec3 *> rows;
//     for (size_t i = 0; i < 3; i++) {
//         if (m[i][0] == 0.0)
//             rows.push_back((Vec3 *)&m(i, 0));
//     }
// }

#endif