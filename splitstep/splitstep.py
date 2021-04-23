"""
Single particle quantum mechanics simulation
using the split-operator method.

References:
https://www.algorithm-archive.org/contents/
split-operator_method/split-operator_method.html

https://en.wikipedia.org/wiki/Split-step_method

"""
from typing import Union, Any, Tuple, Callable
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

