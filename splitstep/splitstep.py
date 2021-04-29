"""
Single particle quantum mechanics simulation
using the split-operator method.

References:
https://www.algorithm-archive.org/contents/
split-operator_method/split-operator_method.html

https://en.wikipedia.org/wiki/Split-step_method

"""
from typing import Union, Any, Tuple, Callable, List
import numpy as np
import scipy.constants as const


class SplitStepMethod:
    """
    Class for the split step method.
    """

    def __init__(self, potential: np.ndarray,
                 dimensions: Tuple[float, ...],
                 timestep: Union[float, np.complex128] = 1e-17):
        if len(potential.shape) != len(dimensions):
            raise Exception('Potential shape does not match dimensions')
        self.m = const.m_e
        self.V = potential
        self._dim = dimensions
        self._exp_potential = None
        self._exp_kinetic = None
        self._norm = False
        self._dt = 0
        self.set_timestep(timestep)

    def set_timestep(self, timestep: Union[float, np.complex128]) -> None:
        """
        Set the timestep. It can be real or complex.
        """
        self._dt = timestep
        self._exp_potential = np.exp(-0.25j*(self._dt/const.hbar)*self.V)
        p = np.meshgrid(*[2.0*np.pi*const.hbar*np.fft.fftfreq(d)*d/
                          self._dim[i] for i, d in enumerate(self.V.shape)])
        self._exp_kinetic = np.exp(-0.5j*(self._dt/(2.0*self.m*const.hbar))
                                   * sum([p_i**2 for p_i in p]))

    def set_potential(self, V: np.ndarray) -> None:
        """
        Change the potential
        """
        self.V = V
        self._exp_potential = np.exp(-0.25j*(self._dt/const.hbar)*self.V)

    def __call__(self, psi: np.ndarray) -> np.ndarray:
        """
        Step the wavefunction in time.
        """
        psi_p = np.fft.fftn(psi*self._exp_potential)
        psi_p = psi_p*self._exp_kinetic
        psi = np.fft.ifftn(psi_p)*self._exp_potential
        if self._norm:
            psi = psi/np.sqrt(np.sum(psi*np.conj(psi)))
        return psi

    def normalize_at_each_step(self, norm: bool) -> None:
        """
        Whether to normalize the wavefunction at each time step or not.
        """
        self._norm = norm


class NonlinearSplitStepMethod(SplitStepMethod):

    def __init__(self, potential, dimensions, timestep):
        SplitStepMethod.__init__(self, potential, dimensions, timestep)
        self._nonlinear = lambda psi: psi

    def __call__(self, psi: np.ndarray) -> np.ndarray:
        """
        Step the wavefunction in time.
        """
        psi = self._nonlinear(psi)
        psi_p = np.fft.fftn(psi*self._exp_potential)
        psi_p = psi_p*self._exp_kinetic
        psi = np.fft.ifftn(psi_p)*self._exp_potential
        psi = self._nonlinear(psi)
        if self._norm:
            psi = psi/np.sqrt(np.sum(psi*np.conj(psi)))
        return psi
    
    def set_nonlinear_term(self, nonlinear_func: Callable) -> None:
        """
        Set the nonlinear term.
        """
        self._nonlinear = nonlinear_func


class DiracSplitStepMethod(SplitStepMethod):
    """
    The dirac splitstep method. Unlike with the other classes that use metric units,
    natural units are used, where hbar = c = 1.

    References:

    Shankar R. (1994). The Dirac Equation. In Principles of Quantum Mechanics,
    chapter 20. Plenum Press.

    https://en.wikipedia.org/wiki/Dirac_equation

    """

    def __init__(self, potential: np.ndarray,
                 dimensions: Tuple[float, ...],
                 timestep: Union[float, np.complex128] = 1.0):
        self._exp_p = None
        self._exp_V = None
        self._exp_m = None
        SplitStepMethod.__init__(self, potential, dimensions, timestep)
        self.m = 1.0

    def set_timestep(self, timestep: Union[float, np.complex128]) -> None:
        p = np.meshgrid(*[(2.0 + 0.0j)*np.pi*np.fft.fftfreq(d)*d/
                          self._dim[i] for i, d in 
                          enumerate(self.V.shape)])
        self._dt = timestep
        dt = self._dt
        I = 1.0j
        m = self.m
        exp, sinh, cosh = np.exp, np.sinh, np.cosh
        exp_kinetic = [[0, 0, 0, 0] for i in range(4)]
        if len(p) == 1:
            px, py, pz = p[0], 0.0, 0.0
            p2 = px**2
            p2[0] = 1e-30
        if len(p) == 2:
            px, py, pz = p[0], p[1], 0.0
            p2 = px**2 + py**2
            p2[0, 0] = 1e-30
        if len(p) == 3:
            px, py, pz = p[0], p[1], p[2]
            p2 = px**2 + py**2 + pz**2
            p2[0, 0, 0] = 1e-30

        # This matrix is found using sympy by exponentiating the alpha_i p_i
        # term in the Dirac equation.
        exp_kinetic[0][0] =  1.0*cosh(0.5*(-dt**2*p2)**0.5)
        exp_kinetic[0][1] =  0
        exp_kinetic[0][2] =  -1.0*I*dt*pz*(-dt**2*p2)**(-0.5)*sinh(0.5*(-dt**2*p2)**0.5)
        exp_kinetic[0][3] =  0.5*dt*(-dt**2*p2)**(-0.5)*(I*px + py - (I*px + py)*exp(1.0*(-dt**2*p2)**0.5))*exp(-0.5*(-dt**2*p2)**0.5)
        exp_kinetic[1][0] =  0
        exp_kinetic[1][1] =  1.0*cosh(0.5*(-dt**2*p2)**0.5)
        exp_kinetic[1][2] =  0.5*dt*(-dt**2*p2)**(-0.5)*(I*px - py + (-I*px + py)*exp(1.0*(-dt**2*p2)**0.5))*exp(-0.5*(-dt**2*p2)**0.5)
        exp_kinetic[1][3] =  1.0*I*dt*pz*(-dt**2*p2)**(-0.5)*sinh(0.5*(-dt**2*p2)**0.5)
        exp_kinetic[2][0] =  1.0*I*pz*(-dt**2*p2)**0.5*sinh(0.5*(-dt**2*p2)**0.5)/(dt*p2)
        exp_kinetic[2][1] =  0.5*(-dt**2*p2)**0.5*(-I*px - py + (I*px + py)*exp(1.0*(-dt**2*p2)**0.5))*exp(-0.5*(-dt**2*p2)**0.5)/(dt*p2)
        exp_kinetic[2][2] =  1.0*cosh(0.5*(-dt**2*p2)**0.5)
        exp_kinetic[2][3] =  0
        exp_kinetic[3][0] =  0.5*(-dt**2*p2)**0.5*(-I*px + py + (I*px - py)*exp(1.0*(-dt**2*p2)**0.5))*exp(-0.5*(-dt**2*p2)**0.5)/(dt*p2)
        exp_kinetic[3][1] =  -1.0*I*pz*(-dt**2*p2)**0.5*sinh(0.5*(-dt**2*p2)**0.5)/(dt*p2)
        exp_kinetic[3][2] =  0
        exp_kinetic[3][3] =  1.0*cosh(0.5*(-dt**2*p2)**0.5)
        self._exp_p = exp_kinetic
        exp_m = [[1.0*exp(-0.25*I*dt*m), 0, 0, 0],
                 [0, 1.0*exp(-0.25*I*dt*m), 0, 0], 
                 [0, 0, 1.0*exp(0.25*I*dt*m), 0], 
                 [0, 0, 0, 1.0*exp(0.25*I*dt*m)]]
        self._exp_m = exp_m
        V = self.V
        exp_V = [[1.0*exp(-0.25*I*V*dt), 0, 0, 0], 
                 [0, 1.0*exp(-0.25*I*V*dt), 0, 0], 
                 [0, 0, 1.0*exp(-0.25*I*V*dt), 0], 
                 [0, 0, 0, 1.0*exp(-0.25*I*V*dt)]]
        self._exp_V = exp_V
        # exp_px = [[1.0*cos(0.5*dt*px), 0, 0, -1.0*I*sin(0.5*dt*px)], 
        #           [0, 1.0*cos(0.5*dt*px), -1.0*I*sin(0.5*dt*px), 0], 
        #           [0, -1.0*I*sin(0.5*dt*px), 1.0*cos(0.5*dt*px), 0], 
        #           [-1.0*I*sin(0.5*dt*px), 0, 0, 1.0*cos(0.5*dt*px)]]
        # self._exp_p.append(exp_px)
        # if len(p) >= 2:
        #     py = p[1]
        #     exp_py = [[1.0*cos(0.5*dt*py), 0, 0, -1.0*sin(0.5*dt*py)], 
        #               [0, 1.0*cos(0.5*dt*py), 1.0*sin(0.5*dt*py), 0],
        #               [0, -1.0*sin(0.5*dt*py), 1.0*cos(0.5*dt*py), 0], 
        #               [1.0*sin(0.5*dt*py), 0, 0, 1.0*cos(0.5*dt*py)]]
        #     self._exp_p.append(exp_py)
        # if len(p) == 3:
        #     pz = p[2]
        #     exp_pz = [[1.0*cos(0.5*dt*pz), 0, -1.0*I*sin(0.5*dt*pz), 0], 
        #               [0, 1.0*cos(0.5*dt*pz), 0, 1.0*I*sin(0.5*dt*pz)], 
        #               [-1.0*I*sin(0.5*dt*pz), 0, 1.0*cos(0.5*dt*pz), 0], 
        #               [0, 1.0*I*sin(0.5*dt*pz), 0, 1.0*cos(0.5*dt*pz)]]
        #     self._exp_p.append(exp_pz)
        # 2D case
        # exp_kinetic[0][0] =  1.0*cosh(0.5*dt*(-p2)**0.5)
        # exp_kinetic[0][1] =  0
        # exp_kinetic[0][2] =  0
        # exp_kinetic[0][3] =  0.5*(-p2)**(-0.5)*(I*px + py - (I*px + py)*exp(1.0*dt*(-p2)**0.5))*exp(-0.5*dt*(-p2)**0.5)
        # exp_kinetic[1][0] =  0
        # exp_kinetic[1][1] =  1.0*cosh(0.5*dt*(-p2)**0.5)
        # exp_kinetic[1][2] =  0.5*(-p2)**(-0.5)*(I*px - py + (-I*px + py)*exp(1.0*dt*(-p2)**0.5))*exp(-0.5*dt*(-p2)**0.5)
        # exp_kinetic[1][3] =  0
        # exp_kinetic[2][0] =  0
        # exp_kinetic[2][1] =  1.0*I*(-p2)**0.5*sinh(0.5*dt*(-p2)**0.5)/(px + I*py)
        # exp_kinetic[2][2] =  1.0*cosh(0.5*dt*(-p2)**0.5)
        # exp_kinetic[2][3] =  0
        # exp_kinetic[3][0] =  -1.0*(-p2)**0.5*sinh(0.5*dt*(-p2)**0.5)/(I*px + py)
        # exp_kinetic[3][1] =  0
        # exp_kinetic[3][2] =  0
        # exp_kinetic[3][3] =  1.0*cosh(0.5*dt*(-p2)**0.5)

    def __call__(self, psi: List[np.ndarray]):
        psi = list_mat_mul_4(self._exp_V, psi)
        psi = list_mat_mul_4(self._exp_m, psi)
        psi_p = [np.fft.fftn(psi[i]) for i in range(4)]
        psi_p = list_mat_mul_4(self._exp_p, psi_p)
        psi = [np.fft.ifftn(psi_p[i]) for i in range(4)]
        psi = list_mat_mul_4(self._exp_m, psi)
        psi = list_mat_mul_4(self._exp_V, psi)
        return psi


def list_mat_mul_4(A, x):
    b = [0, 0, 0, 0]
    for i in range(4):
        for j in range(4):
            b[i] += (A[i][j]*(1.0 + 0.0j))*x[j]
    return b
