#include <stdlib.h>
#include <stdio.h>
#include <vector>
#include "matrix.hpp"

namespace c_functions {

    static void swap_rows(
        ftype *r, ftype *s, int w) {
        if (r == s)
            return;
        for (int i = 0; i < w; i++) {
            ftype tmp = r[i];
            r[i] = s[i];
            s[i] = tmp; 
        }
    }

    /* Overwrite the row r with r + scale_val*s, where scale_val is a scalar
    value, and s is another row. */
    static void add_to_row(ftype *r, ftype scale_val, const ftype *s, int w) {
        for (int i = 0; i < w; i++)
            r[i] += scale_val*s[i];
    }

    /* Note: no checks are done to ensure that the input matrix 
    is actually a square. Expect undefined behaviour if it isn't. */
    static ftype determinant(const ftype **matrix, int size) {
        if (size == 2) {
            return matrix[0][0]*matrix[1][1] - matrix[0][1]*matrix[1][0];
        }
        ftype val = 0.0, sign = 1.0;
        for (int i = 0; i < size; i++) {
            const ftype **sub_matrix
                = (const ftype **)malloc((size - 1)*sizeof(ftype *));
            if (sub_matrix != NULL) {
                int k = 0;
                for (int j = 0; j < size; j++) {
                    if (j != i) {
                        sub_matrix[k] =  &matrix[j][1];
                        k++;
                    }
                }
                val += sign*matrix[i][0]*determinant(sub_matrix, size - 1);
                sign *= -1.0;
                free(sub_matrix);
            } else {
                // TODO: do this properly.
                perror("malloc");
            }
        }
        return val;
    }

    /* Row-reduce an input matrix by Gaussian elimination, so that every 
    element below the main diagonal is zero. Apply these same row operations
    to an input column vector as well, where this column vector has the same
    number of rows as the matrix. */
    static int reduce(
        ftype **matrix, ftype *column_vector, int width, int height) {
        if (height == 1)
            return 0;
        int row_ind = 0;
        for (; matrix[row_ind][0] == 0.0 && row_ind < height; row_ind++);
        swap_rows(matrix[0], matrix[row_ind], width);
        swap_rows(&column_vector[0], &column_vector[row_ind], 1);
        for (int i = 1; i < height; i++) {
            ftype scale_val = -matrix[i][0]/matrix[0][0];
            add_to_row(matrix[i], scale_val, matrix[0], width);
            column_vector[i] += scale_val*column_vector[0];
        }
        if (width < 2)
            return 0;
        ftype **sub_matrix = (ftype **)malloc((height - 1)*sizeof(ftype *));
        if (sub_matrix == NULL) {
            // TODO: do this properly.
            perror("malloc");
            return -1;
        }
        ftype *sub_column_vector = (ftype *)&column_vector[1];
        for (int i = 0; i < height - 1; i++) {
            sub_matrix[i] = &matrix[i + 1][1];
        }
        int ret_val 
            = reduce(sub_matrix, sub_column_vector, width-1, height-1);
        free(sub_matrix);
        return ret_val;
    }

    /* Similar to int reduce(ftype **, ftype*, int, int), but instead make every element
    above the main diagonal zero, rather than below. */
    static int reduce_lower(
        ftype **matrix, ftype *column_vector, int width, int height) {
        if (height == 1)
            return 0;
        int row_ind = height - 1;
        for (; matrix[row_ind][width - 1] == 0.0 && row_ind >= 0; row_ind--);
        swap_rows(matrix[height - 1], matrix[row_ind], width);
        swap_rows(&column_vector[height - 1], &column_vector[row_ind], 1);
        for (int i = height - 2; i >= 0; i--) {
            ftype scale_val = -matrix[i][width - 1]/matrix[height - 1][width - 1];
            add_to_row(matrix[i], scale_val, matrix[height - 1], width);
            column_vector[i] += scale_val*column_vector[height-1];
        }
        if (width < 2)
            return 0;
        ftype **sub_matrix = (ftype **)malloc((height - 1)*sizeof(ftype *));
        if (sub_matrix == NULL) {
            // TODO: do this properly
            perror("malloc");
            return -1;
        }
        for (int i = 0; i < height - 1; i++) {
            sub_matrix[i] = matrix[i];
        }
        int ret_val 
            = reduce_lower(sub_matrix, column_vector, width-1, height-1);
        free(sub_matrix);
        return ret_val;
    }

    static int reduce2(
        ftype **matrix_a, ftype **matrix_b, int size_a, int size_b) {
        if (size_a == 1)
            return 0;
        int row_ind = 0;
        for (; matrix_a[row_ind][0] == 0.0 && row_ind < size_a; row_ind++);
        swap_rows(matrix_a[0], matrix_a[row_ind], size_a);
        swap_rows(matrix_b[0], matrix_b[row_ind], size_b);
        for (int i = 1; i < size_a; i++) {
            ftype scale_val = -matrix_a[i][0]/matrix_a[0][0];
            add_to_row(matrix_a[i], scale_val, matrix_a[0], size_a);
            add_to_row(matrix_b[i], scale_val, matrix_b[0], size_b);
        }
        if (size_a < 2)
            return 0;
        ftype **sub_matrix_a = (ftype **)malloc((size_a - 1)*sizeof(ftype *));
        if (sub_matrix_a == NULL) {
            // TODO: do this properly.
            perror("malloc");
            return -1;
        }
        ftype **sub_matrix_b = &matrix_b[1];
        for (int i = 0; i < size_a - 1; i++) {
            sub_matrix_a[i] = &matrix_a[i + 1][1];
        }
        int ret_val 
            = reduce2(sub_matrix_a, sub_matrix_b, size_a-1, size_b);
        free(sub_matrix_a);
        return ret_val;
    }

    static int reduce_lower2(
        ftype **matrix_a, ftype **matrix_b, int size_a, int size_b) {
        if (size_a == 1)
            return 0;
        int row_ind = size_a - 1;
        for (; matrix_a[row_ind][size_a - 1] == 0.0 && row_ind >= 0; row_ind--);
        swap_rows(matrix_a[size_a - 1], matrix_a[row_ind], size_a);
        swap_rows(matrix_b[size_a - 1], matrix_b[row_ind], size_b);
        for (int i = size_a - 2; i >= 0; i--) {
            ftype scale_val = -matrix_a[i][size_a - 1]/matrix_a[size_a - 1][size_a - 1];
            add_to_row(matrix_a[i], scale_val, matrix_a[size_a - 1], size_a);
            add_to_row(matrix_b[i], scale_val, matrix_b[size_a - 1], size_b);
        }
        if (size_a < 2)
            return 0;
        ftype **sub_matrix_a = (ftype **)malloc((size_a - 1)*sizeof(ftype *));
        if (sub_matrix_a == NULL) {
            // TODO: do this properly
            perror("malloc");
            return -1;
        }
        for (int i = 0; i < size_a - 1; i++) {
            sub_matrix_a[i] = matrix_a[i];
        }
        int ret_val 
            = reduce_lower2(sub_matrix_a, matrix_b, size_a-1, size_b);
        free(sub_matrix_a);
        return ret_val;
    }

    static int invert(ftype **inverse, ftype**matrix, int size) {
        int ret_val1 = reduce2(matrix, inverse, size, size);
        int ret_val2 = reduce_lower2(matrix, inverse, size, size);
        for (int i = 0; i < size; i++)
            for (int j = 0; j < size; j++)
                inverse[i][j] = inverse[i][j]/matrix[i][i];
        return ret_val1 | ret_val2;
    }
}

Matrix::Matrix(int width, int height) {
    this->data = std::vector<ftype> (width*height);
    this->width = width;
    this->height = height;
}

Matrix::Matrix(const std::vector<ftype> &data, int width, int height) {
    this->data = std::vector<ftype> (width*height);
    for (int i = 0; i < std::min(width*height, (int)data.size()); i++)
        this->data[i] = data[i];
    this->width = width;
    this->height = height;
}

Matrix::Matrix(const std::vector<std::vector<ftype>> &data) {
    // TODO: check if each row is of equal size.
    this->data = std::vector<ftype> {};
    this->height = data.size();
    this->width = data[0].size();
    for (int i = 0; i < this->height; i++)
        for (int j = 0; j < this->width; j++)
            this->data.push_back(data[i][j]);
}

std::vector<ftype *> Matrix::get_row_pointers() {
    std::vector<ftype *> tmp {};
    for (int i = 0; i < this->height; i++)
        tmp.push_back(&this->data[this->width*i]);
    return tmp;
}

std::vector<const ftype *> Matrix::get_const_row_pointers() const {
    std::vector<const ftype *> tmp {};
    for (int i = 0; i < this->height; i++)
        tmp.push_back(&this->data[this->width*i]);
    return tmp;
}

ftype Matrix::determinant() const {
    std::vector<const ftype *> m_rows = this->get_const_row_pointers();
    const ftype **m_ptr = &m_rows[0];
    return c_functions::determinant(m_ptr, this->height);
}

std::vector<ftype> Matrix::solve(const std::vector<ftype> &b) const {
    if (this->determinant()*this->determinant() < 1e-20) {
        fprintf(
            stderr, "Matrix might be singular. Expect incorrect solution.\n");
    }
    Matrix m = *this;
    std::vector<ftype *> m_rows = m.get_row_pointers();
    ftype **m_ptr = &m_rows[0];
    std::vector<ftype> b_ {b};
    c_functions::reduce(m_ptr, &b_[0], this->width, this->height);
    c_functions::reduce_lower(m_ptr, &b_[0], this->width, this->height);
    // printf("Matrix solve: \n");
    // m.print();
    // printf("b\n");
    // for (auto &e: b_)
    //     printf("%g, ", e);
    // printf("\n");
    std::vector<ftype> sol {};
    for (int i = 0; i < this->height; i++) {
        sol.push_back(b_[i]/m_ptr[i][i]);
    }
    return sol;
}

Matrix Matrix::identity(int size) {
    Matrix m = Matrix(size, size);
    for (int i = 0; i < size; i++)
        m(i, i) = 1.0;
    return m;
}

Matrix Matrix::operator*(const Matrix &m) const {
    Matrix res(m.width, this->height);
    for (int i = 0; i < this->height; i++) {
        for (int j = 0; j < m.width; j++) {
            ftype sum = 0.0;
            for (int k = 0; k < m.height; k++)
                sum += this->operator()(i, k)*m(k, j);
            res.operator()(i, j) = sum;
        }
    }
    return res;
}

Matrix Matrix::inverse() const {
    Matrix inv = identity(this->width);
    Matrix m = *this;
    c_functions::invert(
        &inv.get_row_pointers()[0], &m.get_row_pointers()[0], this->width);
    return inv;
}

ftype &Matrix::operator()(size_t i, size_t j) {
    return this->data[j*this->width + i];
}

ftype Matrix::operator()(size_t i, size_t j) const {
    return this->data[j*this->width + i];
}

void Matrix::print() {
    for (int i = 0; i < this->height; i++) {
        for (int j = 0; j < this->width; j++) {
            fprintf(stdout, "%g, ", this->data[this->height*i + j]);
        }
        fprintf(stdout, "\n");
    }
}

void Matrix::test_det() {
    auto test_case = [&](Matrix m, ftype actual_sol) {
        ftype computed_sol = m.determinant();
        if ((computed_sol - actual_sol)*(computed_sol - actual_sol) > 1e-20) {
            fprintf(stderr, "Determinant test failed.\n");
            fprintf(stderr, "Matrix: \n");
            m.print();
            fprintf(stderr, "Computed determinant: %g\n", computed_sol);
            fprintf(stderr, "Actual: %g\n", actual_sol);
        }
    };
    {
        Matrix m ({{1, 2}, {3, 4}});
        test_case(m, -2.0);
    }
    {
        Matrix m ({{1, 2}, {3, 4}});
        test_case(m, -2.0);
    }
    {
        Matrix m ({
            {1, 2, 3}, 
            {4, 5, 6},
            {7, 8, 9}});
        test_case(m, 0.0);
    }
    {
        Matrix m ({
            {1, 1, -1}, 
            {1, 0, 1},
            {-1, 1, 0}});
        test_case(m, -3.0);
    }
    {
        Matrix m ({
            {7, -9, 6}, 
            {3, 1, 5},
            {-7, 8, -4}});
        test_case(m, 85.0);
    }
    {
        Matrix m ({
            {1, -1, 5, 7}, 
            {3, 1, 1, -12},
            {-1, 1, -6, 5},
            {2, 2, 0, 1}});
        test_case(m, -272.0);
    }
}

void Matrix::test_solve() {
    typedef std::vector<ftype> vec;
    auto test_case = [&](Matrix m, vec b, vec actual_sol) {
        vec computed_sol = m.solve(b);
        for (int i = 0; i < b.size(); i++) {
            if ((computed_sol[i] - actual_sol[i])
                *(computed_sol[i] - actual_sol[i]) > (1e-15)) {
                fprintf(stderr, "Solve test failed.\n");
                fprintf(stderr, "Matrix:\n");
                m.print();
                fprintf(stderr, "b:\n");
                for (auto &e: b)
                    fprintf(stderr, "%g\n", e);
                fprintf(stderr, "Actual\tComputed\n");
                for (int i = 0; i < b.size(); i++)
                    fprintf(stderr, "%g\t%g\n", actual_sol[i], computed_sol[i]);
            }
        }
    };
    {
        Matrix m ({{1, 2, 1}, {3, -1, 1}, {0, 1, 1}});
        vec b {0.0, 1.0, 2.0};
        vec actual_sol = {-1.0, -1.0, 3.0};
        test_case(m, b, actual_sol);
    }
    {
        Matrix m ({{1.0, 2.0}, {-1.0, 4.0}});
        vec b {3.0, 1.0};
        vec actual_sol {5.0/3.0, 2.0/3.0};
        test_case(m, b, actual_sol);
    }
    {
        Matrix m ({{1, 2}, {3, -1}});
        vec b {0.0, 1.0};
        vec actual_sol {0.28571429, -0.14285714};
        test_case(m, b, actual_sol);
    }
    {
        Matrix m ({
            {1, 2, 3, 7}, 
            {-1, 1, 10, 11}, 
            {1, 5, -7, 5}, 
            {1, 0, -1, 3}});
        vec b {1.0, 2.0, -3.0, 11.0};
        vec actual_sol {0.91911765, -6.30882353, -2.02941176, 2.68382353};
        test_case(m, b, actual_sol);
    }
    {
        Matrix m ({
            {123, 2, -23, 17}, 
            {-21, 0, 21, 0}, 
            {0, 27, -7, 5}, 
            {0, 0, -1, 0}});
        vec b {10.0, 11.0, -12.0, 13.0};
        vec actual_sol {-13.52380952, -19.20521794, -13.0, 83.1081769};
        test_case(m, b, actual_sol);

    }
    {
        Matrix m ({
            {-0.938723, -0.873436, -0.097104}, 
            {-0.775209, 1.110781, -0.082800}, 
            {-0.719618, -0.057215, -0.214977}});
        vec b {-1.21643, -1.15466, -1.33165};
        vec actual_sol {1.11029965, -0.07837832,  2.4986059};
        test_case(m, b, actual_sol);

    }
    {
        Matrix m({
            {1.26881e-08, 1.26881e-08, 0.249947},
            {-1, 1, -0.0047571},
            {-1, -1, -0.00196786}});
        vec b {0.249947, -0.0047571, -0.00196786};
        vec actual_sol {0.0, 0.0, 1.0};
        test_case(m, b, actual_sol);
    }
    {
        Matrix m({
            {1.26881e-08, 1.26881e-08, -0.249778,},
            {-1, 1, 0.0040044},
            {-1, -1, -0.00973701}});
        vec b {-1.94164, 0.849754, -1.19323};
        vec actual_sol {0.14945688, 0.96808283, 7.77346289};
        test_case(m, b, actual_sol);
    }
    {
        Matrix m({
            {0.0, 0.0, 0.249714},
            {-1.0, 1.0, -0.00234629},
            {-1.0, -1.0, -0.0117225}});
        vec b {2.01229, 0.27282, 0.158464};
        vec actual_sol {-0.27232782,  0.01939947,  8.05837879};
        test_case(m, b, actual_sol);
    }
}

void Matrix::test_inverse() {
    auto test_case = [&](Matrix m, Matrix actual_inv) {
        Matrix computed_inv = m.inverse();
        for (int i = 0; i < m.height; i++) {
            for (int j = 0; j < m.width; j++) {
                double val1 = computed_inv(i, j);
                double val2 = actual_inv(i, j);
                if ((val1 - val2)*(val1 - val2) > 1e-15) {
                    fprintf(stderr, "Inverse test failed\n");
                    fprintf(stderr, "Initial matrix:\n");
                    m.print();
                    fprintf(stderr, "Computed inverse:\n");
                    computed_inv.print();
                    fprintf(stderr, "Actual inverse\n");
                    actual_inv.print();
                    return;
                }
            }
        }
    };
    {
        Matrix m({ 1.0, 1.0, -3.0,2.0, 4.0, 7.0, 1.0, -1.0, 8.0
        }, 3, 3);
        Matrix inv_actual 
            = Matrix({
                0.8125    , -0.10416667,  0.39583333,
                -0.1875    ,  0.22916667, -0.27083333,
                -0.125     ,  0.04166667,  0.04166667,
            }, 
            3, 3);
        test_case(m, inv_actual);
    }
    {
        Matrix m({1, 2, 3, 3, -1, -1, 4, 0, 0, 0, 1, -1, 1, 7, 8, 10}, 4, 4);
        Matrix inv_actual = Matrix({
            1.21052632, -0.15789474, -0.05263158, -0.36842105,
            -0.57894737, -0.31578947,  0.89473684,  0.26315789,
            0.15789474,  0.13157895,  0.21052632, -0.02631579,
            0.15789474,  0.13157895, -0.78947368, -0.02631579,
        }, 4, 4);
        test_case(m, inv_actual);
    }
    {
        Matrix m(
            {
        -0.66496007,  0.60998588, -0.63815841, -0.74425266, -0.29178541,
       -0.32199181,  0.88229475,  0.48496337,  0.37512935,  0.86781905,
       -0.4871348 , -0.30220222,  0.97706524, -0.11439789, -0.40157301,
        0.66277796,  0.12968546, -0.59071414, -0.13645016, -0.034748  ,
       -0.0904187 ,  0.46684226, -0.0032956 , -0.90969379, -0.25560453,
        0.76862828, -0.35546154, -0.37062329, -0.63131732, -0.64870415,
       -0.22752663, -0.08795216,  0.15894875, -0.27571757,  0.60445753,
       -0.69880862,  0.15116263, -0.31676159, -0.57066007, -0.57468695,
       -0.58636812,  0.68047539,  0.37200792,  0.63951264,  0.75387394,
        0.32180681, -0.44866558, -0.74131366,  0.34556144, -0.52137216,
        0.71449625,  0.02186778,  0.31244985, -0.46534561, -0.68400071,
       -0.70372862, -0.4966796 , -0.97701859, -0.89683389,  0.10573204,
        0.00154934,  0.16855531,  0.15746971,  0.12059882,  0.93228065,
        0.49648213, -0.75724323,  0.10669833,  0.7995412 ,  0.7075961 ,
        0.45648021, -0.36461451,  0.95024705,  0.29361388, -0.58255983,
        0.13528619, -0.23213152, -0.10179993, -0.61835043, -0.48298178,
        0.46160557, -0.914599  ,  0.97212824,  0.80699848,  0.53603943,
       -0.5728451 ,  0.91927734,  0.97983428, -0.33529171,  0.29186817,
       -0.81315908, -0.49178943,  0.64912934,  0.42289462,  0.79685842,
       -0.65977018,  0.0571152 ,  0.80841917, -0.59948869,  0.94985426
            }, 10, 10);
        Matrix inv_actual = Matrix({
            -0.08609621, -0.25956413,  0.32653954, -0.30127212,  0.04614451,
        0.41711741,  0.20362338, -0.31215612,  0.65818512, -0.42386433,
        0.71534614, -0.59784637,  0.45510133, -0.38497684,  0.82072823,
        0.27498984,  0.03478453,  0.45351168,  0.33406582, -0.07562118,
        0.69485368,  0.11756013, -0.22787713,  0.60023189,  0.0738024 ,
       -0.11471397,  0.66506529,  1.32691642, -0.0015475 , -0.18999095,
       -0.46756159, -0.16079925, -0.00541717, -0.97562117,  0.61589079,
        0.19939166, -0.72213861, -0.63387615,  0.2659597 ,  0.27710923,
       -0.30305513,  0.00748402,  0.43498357,  0.11819142,  0.14959701,
        0.13538479,  0.18117332, -0.87290031,  0.51505867, -0.02430345,
       -0.52060603,  0.30758348,  0.80198466, -0.91424962,  0.13595888,
        0.07760882, -0.2897187 , -1.09432931,  0.50683991,  0.05109721,
        0.03408395,  0.33127394,  0.35312476, -0.36520149,  0.30624846,
        0.23153986, -0.47812609, -1.03744756,  0.84150188, -0.28639984,
        0.45642064, -0.57657554,  0.00632039,  0.2842667 , -0.27042036,
       -0.58605891,  0.33076721,  1.27252202, -0.26435393,  0.13689096,
        0.54226364,  0.12624726, -0.93987995,  0.88830725, -0.31881038,
       -0.50300551,  0.7548024 ,  1.15082085, -0.52992919, -0.52854493,
       -0.12566577,  0.21735588,  0.24565323, -0.82659764,  0.11925662,
        0.59682273, -0.07027608, -0.97918061,  0.37896292,  0.28024983
        }, 10, 10);
        test_case(m, inv_actual);
    }
}